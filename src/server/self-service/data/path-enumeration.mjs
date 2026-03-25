#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataPath = join(__dirname, '..', 'data', 'self-service.json')
const data = JSON.parse(readFileSync(dataPath, 'utf-8'))

const questionsByRoute = new Map(data.questions.map((q) => [q.route, q]))
const outcomesByRoute = new Map(data.outcomes.map((o) => [o.route, o]))
const outcomeTypesById = new Map(data.outcomeTypes.map((ot) => [ot.id, ot]))
const sectionsById = new Map(data.sections.map((s) => [s.id, s]))

function stripHtml(html) {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function esc(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── 1. Build incoming edges ─────────────────────────────────────────

const incomingToQuestion = new Map()
const incomingToOutcome = new Map()

function addIncoming(map, toRoute, info) {
  if (!map.has(toRoute)) map.set(toRoute, [])
  map.get(toRoute).push(info)
}

for (const q of data.questions) {
  if (q.multiSelect) {
    const ms = q.multiSelect
    if (ms.questionRoute) {
      addIncoming(incomingToQuestion, ms.questionRoute, {
        fromRoute: q.route,
        answer: '[non-other checkbox selections]'
      })
    }
    if (ms.outcomeRoute) {
      addIncoming(incomingToOutcome, ms.outcomeRoute, {
        fromRoute: q.route,
        answer: `[checkbox: ${ms.outcomeAnswerId}]`
      })
    }
  } else {
    for (const a of q.answers) {
      if (a.nextQuestionRoute) {
        addIncoming(incomingToQuestion, a.nextQuestionRoute, {
          fromRoute: q.route,
          answer: stripHtml(a.text)
        })
      }
      if (a.outcomeRoute) {
        addIncoming(incomingToOutcome, a.outcomeRoute, {
          fromRoute: q.route,
          answer: stripHtml(a.text)
        })
      }
    }
  }
}

for (const ot of data.outcomeTypes) {
  if (ot.nextQuestionRoute) {
    for (const o of data.outcomes) {
      if ((o.outcomeTypes || []).includes(ot.id)) {
        addIncoming(incomingToQuestion, ot.nextQuestionRoute, {
          fromRoute: o.route,
          answer: `[fork: ${stripHtml(ot.heading || ot.id)}]`
        })
      }
    }
  }
}

// ── 2. Breadcrumbs (shortest path from /sea to each node) ───────────

function computeBreadcrumbs() {
  const crumbs = new Map()
  const queue = [{ route: data.firstQuestionRoute, trail: [] }]
  const visited = new Set()

  while (queue.length > 0) {
    const { route, trail } = queue.shift()
    if (visited.has(route)) continue
    visited.add(route)
    crumbs.set(route, trail)

    const question = questionsByRoute.get(route)
    if (!question) continue

    if (question.multiSelect) {
      const ms = question.multiSelect
      const c = { route, question: stripHtml(question.text), answer: '[checkbox]' }
      if (ms.questionRoute && !visited.has(ms.questionRoute)) {
        queue.push({ route: ms.questionRoute, trail: [...trail, c] })
      }
      if (ms.outcomeRoute) {
        const outcome = outcomesByRoute.get(ms.outcomeRoute)
        if (outcome) {
          crumbs.set(ms.outcomeRoute, [...trail, { ...c, answer: '[other]' }])
          for (const otId of outcome.outcomeTypes || []) {
            const ot = outcomeTypesById.get(otId)
            if (ot?.nextQuestionRoute && !visited.has(ot.nextQuestionRoute)) {
              queue.push({
                route: ot.nextQuestionRoute,
                trail: [
                  ...trail,
                  { ...c, answer: '[other]' },
                  { route: ms.outcomeRoute, question: stripHtml(outcome.heading), answer: `[fork: ${stripHtml(ot.heading || ot.id)}]` }
                ]
              })
            }
          }
        }
      }
    } else {
      for (const a of question.answers) {
        const c = { route, question: stripHtml(question.text), answer: stripHtml(a.text) }
        if (a.nextQuestionRoute && !visited.has(a.nextQuestionRoute)) {
          queue.push({ route: a.nextQuestionRoute, trail: [...trail, c] })
        }
        if (a.outcomeRoute) {
          const outcome = outcomesByRoute.get(a.outcomeRoute)
          if (outcome && !crumbs.has(a.outcomeRoute)) {
            crumbs.set(a.outcomeRoute, [...trail, c])
            for (const otId of outcome.outcomeTypes || []) {
              const ot = outcomeTypesById.get(otId)
              if (ot?.nextQuestionRoute && !visited.has(ot.nextQuestionRoute)) {
                queue.push({
                  route: ot.nextQuestionRoute,
                  trail: [
                    ...trail, c,
                    { route: a.outcomeRoute, question: stripHtml(outcome.heading), answer: `[fork: ${stripHtml(ot.heading || ot.id)}]` }
                  ]
                })
              }
            }
          }
        }
      }
    }
  }
  return crumbs
}

const breadcrumbs = computeBreadcrumbs()

// ── 3. Per-section path enumeration ─────────────────────────────────
// Walk each section independently: from entry points to exit points.
// An "exit" is any transition that leaves the section (outcome or different-section question).

function enumerateSectionPaths() {
  const sectionQuestions = new Map()
  for (const q of data.questions) {
    const sid = q.section || '_none'
    if (!sectionQuestions.has(sid)) sectionQuestions.set(sid, new Set())
    sectionQuestions.get(sid).add(q.route)
  }

  const allSectionPaths = new Map()

  for (const [sectionId, routeSet] of sectionQuestions) {
    // Find entry points: routes in this section reached from outside (or the start)
    const entries = new Set()
    for (const route of routeSet) {
      if (route === data.firstQuestionRoute) {
        entries.add(route)
        continue
      }
      const inc = incomingToQuestion.get(route) || []
      for (const i of inc) {
        const fromQ = questionsByRoute.get(i.fromRoute)
        if (!fromQ || (fromQ.section || '_none') !== sectionId) {
          entries.add(route)
        }
        if (i.answer.startsWith('[fork:')) {
          entries.add(route)
        }
      }
    }

    const paths = []
    const path = []
    const visitedOnPath = new Set()

    function walk(route) {
      if (visitedOnPath.has(route)) {
        paths.push({ steps: [...path], exit: { type: 'cycle', route } })
        return
      }

      const q = questionsByRoute.get(route)
      if (!q) {
        paths.push({ steps: [...path], exit: { type: 'error', detail: `Question not found: ${route}` } })
        return
      }

      if ((q.section || '_none') !== sectionId && path.length > 0) {
        paths.push({ steps: [...path], exit: { type: 'section-exit', route, question: stripHtml(q.text) } })
        return
      }

      visitedOnPath.add(route)

      if (q.multiSelect) {
        const ms = q.multiSelect

        // Non-other path
        if (ms.questionRoute) {
          path.push({ route, question: stripHtml(q.text), answer: '[non-other selections]', isMultiSelect: true })
          walk(ms.questionRoute)
          path.pop()
        }

        // Other path
        if (ms.outcomeRoute && ms.outcomeAnswerId) {
          const otherAnswer = q.answers.find((a) => a.id === ms.outcomeAnswerId)
          path.push({ route, question: stripHtml(q.text), answer: stripHtml(otherAnswer?.text || ms.outcomeAnswerId), isMultiSelect: true })
          const outcome = outcomesByRoute.get(ms.outcomeRoute)
          if (outcome) {
            handleOutcome(outcome)
          } else {
            paths.push({ steps: [...path], exit: { type: 'outcome-missing', route: ms.outcomeRoute } })
          }
          path.pop()
        }
      } else {
        for (const a of q.answers) {
          path.push({ route, question: stripHtml(q.text), answer: stripHtml(a.text) })

          if (a.nextQuestionRoute) {
            walk(a.nextQuestionRoute)
          } else if (a.outcomeRoute) {
            const outcome = outcomesByRoute.get(a.outcomeRoute)
            if (outcome) {
              handleOutcome(outcome)
            } else {
              paths.push({ steps: [...path], exit: { type: 'outcome-missing', route: a.outcomeRoute } })
            }
          }

          path.pop()
        }
      }

      visitedOnPath.delete(route)
    }

    function handleOutcome(outcome) {
      for (const otId of outcome.outcomeTypes || []) {
        const ot = outcomeTypesById.get(otId)
        if (!ot) continue

        if (ot.nextQuestionRoute) {
          // Fork back into question tree — does it re-enter this section or leave?
          const targetQ = questionsByRoute.get(ot.nextQuestionRoute)
          if (targetQ && (targetQ.section || '_none') === sectionId) {
            path.push({ route: outcome.route, question: stripHtml(outcome.heading || ''), answer: `[fork: ${stripHtml(ot.heading || ot.id)}]`, isFork: true })
            walk(ot.nextQuestionRoute)
            path.pop()
          } else {
            paths.push({
              steps: [...path],
              exit: { type: 'fork-exit', outcomeRoute: outcome.route, outcomeTypeId: ot.id, targetRoute: ot.nextQuestionRoute, heading: stripHtml(ot.heading || ot.id) }
            })
          }
        } else {
          paths.push({
            steps: [...path],
            exit: {
              type: 'terminal',
              outcomeRoute: outcome.route,
              outcomeHeading: stripHtml(outcome.heading),
              outcomeTypeId: ot.id,
              outcomeTypeHeading: stripHtml(ot.heading),
              outcomeTypeText: stripHtml(ot.text),
              module: ot.module,
              link: ot.link
            }
          })
        }
      }
    }

    for (const entry of entries) {
      walk(entry)
    }

    allSectionPaths.set(sectionId, { paths, entries: [...entries] })
  }

  return allSectionPaths
}

const sectionPaths = enumerateSectionPaths()

// ── 4. Redundancy analysis ──────────────────────────────────────────

function analysePathRedundancy(pathSteps) {
  const warnings = []
  const seenQuestions = new Map()

  for (let i = 0; i < pathSteps.length; i++) {
    const step = pathSteps[i]
    const norm = step.question.toLowerCase().trim()

    // 1. Exact duplicate question text
    if (seenQuestions.has(norm)) {
      const prevIdx = seenQuestions.get(norm)
      warnings.push({
        type: 'duplicate-question',
        stepIndex: i + 1,
        previousStepIndex: prevIdx + 1,
        question: step.question,
        route: step.route,
        previousRoute: pathSteps[prevIdx].route
      })
    }
    seenQuestions.set(norm, i)

    // 2. Semantic redundancy: a prior answer already implies this question's answer.
    //    Pattern: a Yes/No question whose subject appears in a prior step's answer.
    //    e.g. step 2 answer = "Pontoons", step 3 question = "Is the purpose ... pontoon?"
    if (i > 0) {
      const qWords = extractKeywords(step.question)
      for (let j = 0; j < i; j++) {
        const prevAnswer = pathSteps[j].answer
        const aWords = extractKeywords(prevAnswer)
        if (aWords.length === 0) continue

        // Check if any significant keyword from the prior answer appears in this question
        const overlap = aWords.filter((w) => qWords.includes(w))
        if (overlap.length > 0 && overlap.length >= aWords.length * 0.5) {
          warnings.push({
            type: 'implied-by-prior-answer',
            stepIndex: i + 1,
            previousStepIndex: j + 1,
            question: step.question,
            route: step.route,
            previousAnswer: prevAnswer,
            previousRoute: pathSteps[j].route,
            overlappingWords: overlap
          })
          break
        }
      }
    }
  }

  return warnings
}

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'shall',
  'have', 'has', 'had', 'having', 'may', 'might', 'must', 'can',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as',
  'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'and', 'but', 'or', 'nor', 'not', 'no', 'yes',
  'it', 'its', 'this', 'that', 'these', 'those', 'they', 'them', 'their',
  'what', 'which', 'who', 'whom', 'how', 'where', 'when', 'why',
  'if', 'then', 'than', 'so', 'up', 'out', 'about',
  'your', 'you', 'we', 'our', 'my', 'i', 'me',
  'purpose', 'activity', 'involve', 'involves', 'involved', 'involving',
  'proposed', 'carry', 'carried', 'provide', 'select', 'selected',
  'type', 'place', 'take', 'other'
])

function extractKeywords(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
}

function textSimilarity(a, b) {
  const wordsA = new Set(a.toLowerCase().split(/\s+/))
  const wordsB = new Set(b.toLowerCase().split(/\s+/))
  const intersection = [...wordsA].filter((w) => wordsB.has(w)).length
  const union = new Set([...wordsA, ...wordsB]).size
  return union === 0 ? 0 : intersection / union
}

function findSimilarQuestions() {
  const questions = data.questions.map((q) => ({ route: q.route, text: stripHtml(q.text), section: q.section }))
  const similar = []
  for (let i = 0; i < questions.length; i++) {
    for (let j = i + 1; j < questions.length; j++) {
      const sim = textSimilarity(questions[i].text, questions[j].text)
      if (sim > 0.7) {
        similar.push({
          route1: questions[i].route, text1: questions[i].text, section1: questions[i].section,
          route2: questions[j].route, text2: questions[j].text, section2: questions[j].section,
          similarity: Math.round(sim * 100)
        })
      }
    }
  }
  return similar.sort((a, b) => b.similarity - a.similarity)
}

function findOrphanedQuestions() {
  const reachable = new Set(breadcrumbs.keys())
  return data.questions.filter((q) => !reachable.has(q.route)).map((q) => ({ route: q.route, question: stripHtml(q.text) }))
}

function findOrphanedOutcomes() {
  const referenced = new Set()
  for (const q of data.questions) {
    if (q.multiSelect?.outcomeRoute) referenced.add(q.multiSelect.outcomeRoute)
    for (const a of q.answers || []) {
      if (a.outcomeRoute) referenced.add(a.outcomeRoute)
    }
  }
  return data.outcomes.filter((o) => !referenced.has(o.route)).map((o) => ({ route: o.route, heading: stripHtml(o.heading), outcomeTypes: o.outcomeTypes }))
}

function findUnusedOutcomeTypes() {
  const used = new Set()
  for (const o of data.outcomes) {
    for (const otId of o.outcomeTypes || []) used.add(otId)
  }
  return data.outcomeTypes.filter((ot) => !used.has(ot.id)).map((ot) => ({ id: ot.id, heading: stripHtml(ot.heading) }))
}

const similarQuestions = findSimilarQuestions()
const orphanedQuestions = findOrphanedQuestions()
const orphanedOutcomes = findOrphanedOutcomes()
const unusedOutcomeTypes = findUnusedOutcomeTypes()

// ── 5. Generate HTML ────────────────────────────────────────────────

function renderBreadcrumbs(crumbs) {
  if (!crumbs || crumbs.length === 0) return '<em>Entry point</em>'
  return crumbs.map((c) => `<span class="crumb"><code>${esc(c.route)}</code> "${esc(c.question)}" &rarr; <strong>${esc(c.answer)}</strong></span>`).join(' &rarr; ')
}

function exitDescription(exit) {
  if (exit.type === 'terminal') {
    return `<div class="exit exit-terminal"><strong>OUTCOME:</strong> ${esc(exit.outcomeTypeHeading || exit.outcomeTypeId)}<br>
<small>${esc((exit.outcomeTypeText || '').slice(0, 200))}</small><br>
<small><code>${esc(exit.outcomeTypeId)}</code> via <code>${esc(exit.outcomeRoute)}</code></small>
${exit.module ? `<br><small>Module: <code>${esc(exit.module)}</code></small>` : ''}
${exit.link ? `<br><small>Link: ${esc(exit.link)}</small>` : ''}
</div>`
  }
  if (exit.type === 'section-exit') {
    return `<div class="exit exit-section"><strong>CONTINUES TO:</strong> <code>${esc(exit.route)}</code> "${esc(exit.question)}" (different section)</div>`
  }
  if (exit.type === 'fork-exit') {
    return `<div class="exit exit-section"><strong>FORK:</strong> ${esc(exit.heading)} &rarr; <code>${esc(exit.targetRoute)}</code> (different section)</div>`
  }
  if (exit.type === 'cycle') {
    return `<div class="exit exit-error"><strong>CYCLE:</strong> loops back to <code>${esc(exit.route)}</code></div>`
  }
  return `<div class="exit exit-error"><strong>ERROR:</strong> ${esc(exit.detail || exit.type)}</div>`
}

function generateHtml() {
  const parts = []

  // Count totals
  let totalPaths = 0
  let pathsWithWarnings = 0
  for (const [, { paths }] of sectionPaths) {
    totalPaths += paths.length
    for (const p of paths) {
      if (analysePathRedundancy(p.steps).length > 0) pathsWithWarnings++
    }
  }

  parts.push(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Self-Service Decision Tree Review</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "GDS Transport", Arial, sans-serif; max-width: 1300px; margin: 0 auto; padding: 20px; background: #f3f2f1; color: #0b0c0c; }
  h1 { font-size: 36px; margin-bottom: 10px; }
  h2 { font-size: 24px; margin: 30px 0 10px; border-bottom: 4px solid #1d70b8; padding-bottom: 8px; }
  h3 { font-size: 19px; margin: 20px 0 8px; }
  .summary { background: #fff; padding: 20px; margin: 20px 0; border-left: 5px solid #1d70b8; }
  .summary dt { font-weight: bold; margin-top: 8px; }
  .summary dd { margin-left: 0; }
  .toc { background: #fff; padding: 15px 20px; margin: 20px 0; border: 1px solid #b1b4b6; }
  .toc a { color: #1d70b8; }
  .toc ul { margin-left: 20px; }
  .toc li { margin: 4px 0; }

  .path-card { background: #fff; padding: 12px 16px; margin: 8px 0; border: 1px solid #b1b4b6; }
  .path-card.has-warning { border-left: 4px solid #f47738; }
  .path-header { cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
  .path-header:hover { color: #1d70b8; }
  .path-body { display: none; margin-top: 12px; }
  .path-card.open .path-body { display: block; }

  .step { padding: 6px 0; border-bottom: 1px solid #f3f2f1; display: grid; grid-template-columns: 30px 1fr 1fr 200px; gap: 10px; align-items: start; font-size: 14px; }
  .step:last-child { border-bottom: none; }
  .step-num { color: #505a5f; font-weight: bold; }
  .step-question { font-weight: bold; }
  .step-answer { color: #1d70b8; }
  .step-route { color: #505a5f; font-family: monospace; font-size: 13px; word-break: break-all; }

  .exit { padding: 8px 12px; margin-top: 8px; border-radius: 4px; font-size: 14px; }
  .exit-terminal { background: #e8f5e9; border: 1px solid #00703c; }
  .exit-section { background: #e8eef7; border: 1px solid #1d70b8; }
  .exit-error { background: #fce4e4; border: 1px solid #d4351c; }

  .redundancy { background: #fef7e5; padding: 6px 10px; margin: 4px 0; border-left: 3px solid #f47738; font-size: 13px; }

  .question-card { background: #fff; padding: 15px 20px; margin: 10px 0; border: 1px solid #b1b4b6; }
  .question-card.has-warning { border-left: 4px solid #f47738; }
  .question-header { cursor: pointer; }
  .question-header:hover { color: #1d70b8; }
  .question-body { display: none; margin-top: 12px; }
  .question-card.open .question-body { display: block; }
  .question-title { font-size: 18px; font-weight: bold; }
  .question-meta { font-size: 14px; color: #505a5f; margin-top: 4px; }

  .answer-table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  .answer-table td, .answer-table th { border: 1px solid #b1b4b6; padding: 8px; text-align: left; font-size: 14px; }
  .answer-table th { background: #f3f2f1; }

  .breadcrumb-trail { font-size: 13px; color: #505a5f; margin: 8px 0; line-height: 1.8; }
  .crumb { white-space: nowrap; }

  .badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 13px; font-weight: bold; margin-left: 8px; }
  .badge-warning { background: #f47738; color: #fff; }
  .badge-multi { background: #912b88; color: #fff; }
  .badge-fork { background: #912b88; color: #fff; }
  .badge-orphan { background: #d4351c; color: #fff; }
  .badge-count { background: #505a5f; color: #fff; }

  .group { margin: 20px 0; }
  .group-header { background: #1d70b8; color: #fff; padding: 10px 15px; font-size: 19px; cursor: pointer; }
  .group-header:hover { background: #003078; }
  .group-body { display: none; padding: 5px 0; }
  .group.open .group-body { display: block; }

  .filter-bar { background: #fff; padding: 15px; margin: 20px 0; border: 1px solid #b1b4b6; display: flex; gap: 15px; align-items: center; flex-wrap: wrap; }
  .filter-bar input { padding: 8px; font-size: 16px; width: 400px; border: 2px solid #0b0c0c; }
  .filter-bar select { padding: 8px; font-size: 16px; border: 2px solid #0b0c0c; }
  .filter-bar label { font-weight: bold; }

  .similar-pair { background: #fff; padding: 12px; margin: 8px 0; border: 1px solid #b1b4b6; }
  .sim-score { font-weight: bold; color: #d4351c; }

  table { border-collapse: collapse; width: 100%; margin: 10px 0; }
  td, th { border: 1px solid #b1b4b6; padding: 8px; text-align: left; font-size: 14px; }
  th { background: #f3f2f1; }

  .hidden { display: none !important; }
  code { background: #f3f2f1; padding: 1px 4px; font-size: 13px; }

  .tab-bar { display: flex; gap: 0; margin: 20px 0 0; }
  .tab { padding: 10px 20px; background: #b1b4b6; color: #0b0c0c; cursor: pointer; font-weight: bold; border: 1px solid #b1b4b6; }
  .tab.active { background: #fff; border-bottom: 1px solid #fff; }
  .tab-content { display: none; border: 1px solid #b1b4b6; border-top: none; padding: 15px; background: #fff; }
  .tab-content.active { display: block; }
</style>
</head>
<body>

<h1>Self-Service Decision Tree Review</h1>
<p>Generated ${new Date().toISOString().split('T')[0]} from self-service.json</p>

<div class="summary">
  <dl>
    <dt>Questions</dt><dd>${data.questions.length} (${data.questions.filter((q) => q.multiSelect).length} multiselect)</dd>
    <dt>Outcomes</dt><dd>${data.outcomes.length}</dd>
    <dt>Outcome types</dt><dd>${data.outcomeTypes.length}</dd>
    <dt>Total transitions</dt><dd>${data.questions.reduce((n, q) => n + q.answers.length, 0)}</dd>
    <dt>Sections</dt><dd>${sectionPaths.size}</dd>
    <dt>Total paths (across all sections)</dt><dd>${totalPaths}</dd>
    <dt>Paths with redundancy warnings</dt><dd>${pathsWithWarnings}</dd>
    <dt>Similar question pairs</dt><dd>${similarQuestions.length}</dd>
    <dt>Orphaned questions</dt><dd>${orphanedQuestions.length}</dd>
    <dt>Orphaned outcomes</dt><dd>${orphanedOutcomes.length}</dd>
    <dt>Unused outcome types</dt><dd>${unusedOutcomeTypes.length}</dd>
  </dl>
</div>

<div class="toc">
  <h3>Contents</h3>
  <ul>
    <li><a href="#warnings">Warnings &amp; Redundancy</a></li>
    <li><a href="#paths">Section Paths (journey review)</a></li>
    <li><a href="#questions">All Questions (per-question detail)</a></li>
  </ul>
</div>
`)

  // ── Warnings ──

  parts.push(`<h2 id="warnings">Warnings &amp; Redundancy</h2>`)

  if (orphanedQuestions.length > 0) {
    parts.push(`<h3>Orphaned Questions (unreachable from /sea)</h3>
<table><tr><th>Route</th><th>Question text</th></tr>`)
    for (const q of orphanedQuestions) {
      parts.push(`<tr><td><code>${esc(q.route)}</code></td><td>${esc(q.question)}</td></tr>`)
    }
    parts.push(`</table>`)
  }

  if (orphanedOutcomes.length > 0) {
    parts.push(`<h3>Orphaned Outcomes (no question routes to them)</h3>
<table><tr><th>Route</th><th>Heading</th><th>Outcome types</th></tr>`)
    for (const o of orphanedOutcomes) {
      parts.push(`<tr><td><code>${esc(o.route)}</code></td><td>${esc(o.heading)}</td><td>${esc((o.outcomeTypes || []).join(', '))}</td></tr>`)
    }
    parts.push(`</table>`)
  }

  if (unusedOutcomeTypes.length > 0) {
    parts.push(`<h3>Unused Outcome Types</h3>
<table><tr><th>ID</th><th>Heading</th></tr>`)
    for (const ot of unusedOutcomeTypes) {
      parts.push(`<tr><td><code>${esc(ot.id)}</code></td><td>${esc(ot.heading)}</td></tr>`)
    }
    parts.push(`</table>`)
  }

  if (similarQuestions.length > 0) {
    parts.push(`<h3>Similar Questions (possible duplicates)</h3>
<p>Question pairs with very similar wording. They may be asking the same thing at different points in the tree.</p>`)
    for (const pair of similarQuestions.slice(0, 40)) {
      parts.push(`<div class="similar-pair">
  <span class="sim-score">${pair.similarity}% similar</span>
  <p><code>${esc(pair.route1)}</code> (${esc(pair.section1)}): "${esc(pair.text1)}"</p>
  <p><code>${esc(pair.route2)}</code> (${esc(pair.section2)}): "${esc(pair.text2)}"</p>
</div>`)
    }
  }

  // ── Section paths ──

  parts.push(`<h2 id="paths">Section Paths</h2>
<p>Each section is enumerated independently. A "path" is one route through a section from its entry point to where it exits (either a terminal outcome, or a transition to a different section). The longest section has ${Math.max(...[...sectionPaths.values()].map((s) => s.paths.length))} paths. Redundancy warnings flag questions that appear more than once on the same path.</p>

<div class="filter-bar">
  <label for="path-search">Filter paths:</label>
  <input type="text" id="path-search" placeholder="Search by question, answer, route, or outcome...">
  <label><input type="checkbox" id="path-warnings-only"> Warnings only</label>
</div>`)

  let pathNum = 0
  for (const [sectionId, { paths, entries }] of sectionPaths) {
    const sectionLabel = sectionsById.get(sectionId)?.text || sectionId
    const sectionWarningCount = paths.filter((p) => analysePathRedundancy(p.steps).length > 0).length
    let warningBadge = ''
    if (sectionWarningCount > 0) {
      warningBadge = ` <span class="badge badge-warning">${sectionWarningCount} with warnings</span>`
    }

    parts.push(`<div class="group section-group" data-section="${esc(sectionId)}">
  <div class="group-header" onclick="this.parentElement.classList.toggle('open')">
    ${esc(sectionLabel)} <span class="badge badge-count">${paths.length} paths</span>${warningBadge}
  </div>
  <div class="group-body">
    <p style="font-size:14px;color:#505a5f;padding:8px">Entry points: ${entries.map((e) => `<code>${esc(e)}</code>`).join(', ')}</p>`)

    for (const p of paths) {
      pathNum++
      const warnings = analysePathRedundancy(p.steps)
      const warningsByStep = new Map()
      for (const w of warnings) {
        if (!warningsByStep.has(w.stepIndex)) warningsByStep.set(w.stepIndex, [])
        warningsByStep.get(w.stepIndex).push(w)
      }

      const hasWarning = warnings.length > 0
      const searchText = p.steps.map((s) => `${s.route} ${s.question} ${s.answer}`).join(' ').toLowerCase()

      // Build a short summary line
      const firstStep = p.steps[0]
      const exitSummary =
        p.exit.type === 'terminal'
          ? p.exit.outcomeTypeHeading || p.exit.outcomeTypeId
          : p.exit.type === 'section-exit'
            ? `→ ${p.exit.route}`
            : p.exit.type === 'fork-exit'
              ? `→ fork: ${p.exit.heading}`
              : p.exit.type

      let badges = ''
      if (hasWarning) badges += `<span class="badge badge-warning">${warnings.length} warning${warnings.length > 1 ? 's' : ''}</span>`
      if (p.steps.some((s) => s.isFork)) badges += '<span class="badge badge-fork">fork</span>'
      if (p.steps.some((s) => s.isMultiSelect)) badges += '<span class="badge badge-multi">multi</span>'

      parts.push(`<div class="path-card${hasWarning ? ' has-warning' : ''}" data-search="${esc(searchText)}" data-has-warning="${hasWarning}">
  <div class="path-header" onclick="this.parentElement.classList.toggle('open')">
    <span><strong>Path ${pathNum}</strong> (${p.steps.length} steps): ${esc(firstStep?.question?.slice(0, 50) || '?')} &rarr; ${esc(exitSummary.slice(0, 60))}</span>
    <span>${badges}</span>
  </div>
  <div class="path-body">`)

      for (let i = 0; i < p.steps.length; i++) {
        const step = p.steps[i]
        parts.push(`<div class="step">
  <span class="step-num">${i + 1}.</span>
  <span class="step-question">${esc(step.question)}</span>
  <span class="step-answer">${esc(step.answer)}</span>
  <span class="step-route">${esc(step.route)}</span>
</div>`)
        const sw = warningsByStep.get(i + 1)
        if (sw) {
          for (const w of sw) {
            if (w.type === 'duplicate-question') {
              parts.push(`<div class="redundancy">Redundant? This question was already asked at step ${w.previousStepIndex} (<code>${esc(w.previousRoute)}</code>)</div>`)
            } else if (w.type === 'implied-by-prior-answer') {
              parts.push(`<div class="redundancy">Redundant? Step ${w.previousStepIndex} already answered "${esc(w.previousAnswer)}" — this question's answer is implied (shared: ${esc(w.overlappingWords.join(', '))})</div>`)
            }
          }
        }
      }

      parts.push(exitDescription(p.exit))
      parts.push(`</div></div>`)
    }

    parts.push(`</div></div>`)
  }

  // ── Per-question detail ──

  parts.push(`<h2 id="questions">All Questions</h2>
<p>Each section contains all question pages that belong to it (not steps in a single journey — sections branch widely). Click to expand a question and see its answers, destinations, and how you reach it.</p>

<div class="filter-bar">
  <label for="q-search">Filter:</label>
  <input type="text" id="q-search" placeholder="Search question text, route, or answer...">
  <label for="q-section">Section:</label>
  <select id="q-section">
    <option value="">All sections</option>
    ${data.sections.map((s) => `<option value="${esc(s.id)}">${esc(s.text)}</option>`).join('\n    ')}
  </select>
</div>`)

  const questionsBySection = new Map()
  for (const q of data.questions) {
    const sid = q.section || '_none'
    if (!questionsBySection.has(sid)) questionsBySection.set(sid, [])
    questionsBySection.get(sid).push(q)
  }

  for (const [sectionId, questions] of questionsBySection) {
    const sectionLabel = sectionsById.get(sectionId)?.text || sectionId
    parts.push(`<div class="group" data-section="${esc(sectionId)}">
  <div class="group-header" onclick="this.parentElement.classList.toggle('open')">
    ${esc(sectionLabel)} <span class="badge badge-count">${questions.length} question pages</span>
  </div>
  <div class="group-body">`)

    for (const q of questions) {
      const isOrphan = orphanedQuestions.some((oq) => oq.route === q.route)
      const hasSimilar = similarQuestions.some((s) => s.route1 === q.route || s.route2 === q.route)
      const hasWarning = isOrphan || hasSimilar
      const searchText = [q.route, stripHtml(q.text), ...(q.answers || []).map((a) => stripHtml(a.text))].join(' ').toLowerCase()

      let badges = ''
      if (isOrphan) badges += '<span class="badge badge-orphan">orphaned</span>'
      if (hasSimilar) badges += '<span class="badge badge-warning">similar to another</span>'
      if (q.multiSelect) badges += '<span class="badge badge-multi">multiselect</span>'

      parts.push(`<div class="question-card${hasWarning ? ' has-warning' : ''}" data-search="${esc(searchText)}" data-section="${esc(q.section || '')}">
  <div class="question-header" onclick="this.parentElement.classList.toggle('open')">
    <span class="question-title">${esc(stripHtml(q.text))}</span>${badges}
    <div class="question-meta"><code>${esc(q.route)}</code>${q.mcmsAppFormMapping ? ` | mapping: <code>${esc(q.mcmsAppFormMapping)}</code>` : ''}</div>
  </div>
  <div class="question-body">`)

      const crumbs = breadcrumbs.get(q.route)
      parts.push(`<div class="breadcrumb-trail"><strong>How you get here:</strong> ${renderBreadcrumbs(crumbs)}</div>`)

      const incoming = incomingToQuestion.get(q.route) || []
      if (incoming.length > 0) {
        parts.push(`<p style="font-size:14px;color:#505a5f">Reached from ${incoming.length} route(s): ${incoming.map((inc) => `<code>${esc(inc.fromRoute)}</code> (${esc(inc.answer)})`).join(', ')}</p>`)
      }

      if (q.multiSelect) {
        const ms = q.multiSelect
        parts.push(`<table class="answer-table"><tr><th>Answer (checkbox)</th><th>Leads to</th></tr>`)
        for (const a of q.answers) {
          const isOther = a.id === ms.outcomeAnswerId
          const dest = isOther ? ms.outcomeRoute : ms.questionRoute
          parts.push(`<tr><td>${esc(stripHtml(a.text))}${isOther ? ' <strong>(other)</strong>' : ''}</td><td><code>${esc(dest)}</code> (${isOther ? 'outcome' : 'question'})</td></tr>`)
        }
        parts.push(`</table>`)
      } else {
        parts.push(`<table class="answer-table"><tr><th>#</th><th>Answer</th><th>Leads to</th><th>Type</th></tr>`)
        for (let i = 0; i < q.answers.length; i++) {
          const a = q.answers[i]
          const dest = a.nextQuestionRoute || a.outcomeRoute || '???'
          const destType = a.nextQuestionRoute ? 'question' : 'outcome'
          const destNode = a.nextQuestionRoute ? questionsByRoute.get(a.nextQuestionRoute) : outcomesByRoute.get(a.outcomeRoute)
          const destLabel = destNode ? stripHtml(destNode.text || destNode.heading || '').slice(0, 80) : ''
          parts.push(`<tr><td>${i + 1}</td><td>${esc(stripHtml(a.text))}</td><td><code>${esc(dest)}</code><br><small>${esc(destLabel)}</small></td><td>${destType}</td></tr>`)
        }
        parts.push(`</table>`)
      }

      if (q.hint) {
        parts.push(`<details><summary>Hint text</summary><div style="padding:8px;font-size:14px;background:#f3f2f1">${esc(stripHtml(q.hint))}</div></details>`)
      }

      parts.push(`</div></div>`)
    }

    parts.push(`</div></div>`)
  }

  // ── Scripts ──

  parts.push(`
<script>
// Path filtering
const pathSearch = document.getElementById('path-search')
const warningsOnly = document.getElementById('path-warnings-only')

function filterPaths() {
  const query = pathSearch.value.toLowerCase().trim()
  const wOnly = warningsOnly.checked

  document.querySelectorAll('.path-card').forEach(function(el) {
    const matchesSearch = !query || (el.getAttribute('data-search') || '').includes(query)
    const matchesWarning = !wOnly || el.getAttribute('data-has-warning') === 'true'
    el.classList.toggle('hidden', !(matchesSearch && matchesWarning))
  })
  document.querySelectorAll('.section-group').forEach(function(g) {
    const visible = g.querySelectorAll('.path-card:not(.hidden)').length
    g.classList.toggle('hidden', visible === 0)
    if ((query || wOnly) && visible > 0) g.classList.add('open')
  })
}
pathSearch.addEventListener('input', filterPaths)
warningsOnly.addEventListener('change', filterPaths)

// Question filtering
const qSearch = document.getElementById('q-search')
const qSection = document.getElementById('q-section')

function filterQuestions() {
  const query = qSearch.value.toLowerCase().trim()
  const section = qSection.value

  document.querySelectorAll('.question-card').forEach(function(el) {
    const matchesSearch = !query || (el.getAttribute('data-search') || '').includes(query)
    const matchesSection = !section || el.getAttribute('data-section') === section
    el.classList.toggle('hidden', !(matchesSearch && matchesSection))
  })
  document.querySelectorAll('.group[data-section]:not(.section-group)').forEach(function(g) {
    const visible = g.querySelectorAll('.question-card:not(.hidden)').length
    g.classList.toggle('hidden', visible === 0)
    if ((query || section) && visible > 0) g.classList.add('open')
  })
}
qSearch.addEventListener('input', filterQuestions)
qSection.addEventListener('change', filterQuestions)
</script>
</body>
</html>`)

  return parts.join('\n')
}

// ── Console summary ─────────────────────────────────────────────────

let totalPaths = 0
let pathsWithWarnings = 0
for (const [, { paths }] of sectionPaths) {
  totalPaths += paths.length
  for (const p of paths) {
    if (analysePathRedundancy(p.steps).length > 0) pathsWithWarnings++
  }
}

console.log(`\nDecision Tree Analysis`)
console.log(`======================`)
console.log(`Questions:               ${data.questions.length}`)
console.log(`Outcomes:                ${data.outcomes.length}`)
console.log(`Outcome types:           ${data.outcomeTypes.length}`)
console.log(`Total transitions:       ${data.questions.reduce((n, q) => n + q.answers.length, 0)}`)
console.log(`Sections:                ${sectionPaths.size}`)
console.log(`Total section paths:     ${totalPaths}`)
console.log(`Paths with warnings:     ${pathsWithWarnings}`)
console.log(`Similar question pairs:  ${similarQuestions.length}`)
console.log(`Orphaned questions:      ${orphanedQuestions.length}`)
console.log(`Orphaned outcomes:       ${orphanedOutcomes.length}`)
console.log(`Unused outcome types:    ${unusedOutcomeTypes.length}`)
console.log()

console.log('Paths per section:')
for (const [sectionId, { paths, entries }] of sectionPaths) {
  const label = (sectionsById.get(sectionId)?.text || sectionId).padEnd(60)
  const warnCount = paths.filter((p) => analysePathRedundancy(p.steps).length > 0).length
  console.log(`  ${label} ${String(paths.length).padStart(4)} paths  ${String(entries.length).padStart(2)} entry pts${warnCount > 0 ? `  (${warnCount} with warnings)` : ''}`)
}
console.log()

if (orphanedQuestions.length > 0) {
  console.log('Orphaned questions:')
  for (const q of orphanedQuestions) console.log(`  ${q.route}`)
  console.log()
}

if (similarQuestions.length > 0) {
  console.log('Top similar question pairs:')
  for (const pair of similarQuestions.slice(0, 10)) {
    console.log(`  ${pair.similarity}% | ${pair.route1}  <->  ${pair.route2}`)
  }
  console.log()
}

const outPath = './journey-review.html'
writeFileSync(outPath, generateHtml())
console.log(`HTML review document written to: ${outPath}`)
console.log(`Open it in a browser for SME review.\n`)
