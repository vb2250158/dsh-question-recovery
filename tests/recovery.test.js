import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'

test('recovery is limited to interrupted valid questions', async () => {
  let factory
  const context = { window: { __ModuleLoader__: { load(value) { factory = value.factory } } } }
  const code = (await readFile(new URL('../lib/client.js', import.meta.url), 'utf8')).replace('function questionsFor(', 'globalThis.questionsFor = function questionsFor(')
  runInNewContext(code, context); factory(() => ({}))
  const questions = [{ id: 'choice', question: 'Choose?', options: [{ label: 'A' }, { label: 'B' }], multi_select: true }]
  const block = { error: { code: 'TOOL_OUTCOME_UNKNOWN' }, call: { argsRaw: JSON.stringify({ questions }) } }
  assert.equal(context.questionsFor(block)[0].id, 'choice')
  assert.equal(context.questionsFor({ ...block, error: { code: 'ASK_CANCELLED' } }), null)
  assert.equal(context.questionsFor({ ...block, error: undefined }), null)
  assert.equal(context.questionsFor({ ...block, call: { argsRaw: '{' } }), null)
  assert.equal(context.questionsFor({ ...block, call: { argsRaw: JSON.stringify({ questions: [...questions, ...questions] }) } }), null)
})

test('registration delegates normal calls and routes recovered answers to the originating session', async () => {
  let factory, replacement, send, session
  const original = { options: { key: 'ask_user_question' }, component: function Official() {} }
  const context = { window: { __ModuleLoader__: { load(value) { factory = value.factory } } } }
  runInNewContext(await readFile(new URL('../lib/client.js', import.meta.url), 'utf8'), context)
  const plugin = factory(() => ({ createElement: (component, props) => ({ component, props }) }))
  const ctx = {
    slots: { inject(name, callback) { callback() }, entries: () => [original], register(options, component) { replacement = component; send = options.inject('original-session').send; return () => {} } },
    sessions: { scope(id) { session = id; return { conversation: { send: async text => text } } } },
  }
  plugin.apply(ctx)
  assert.equal(replacement({ block: {}, callId: 'a' }).component, original.component)
  assert.equal(await send('chosen answer'), 'chosen answer')
  assert.equal(session, 'original-session')
})
