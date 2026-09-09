window.__ModuleLoader__.load({
  id: 'dsh-question-recovery',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    function questionsFor(block) {
      if (!['TOOL_OUTCOME_UNKNOWN', 'TOOL_NOT_STARTED', 'ASK_ABORTED'].includes(block.error?.code)) return null
      let data
      try { data = JSON.parse(block.call?.argsRaw || '') } catch { return null }
      if (!Array.isArray(data.questions) || !data.questions.length) return null
      const ids = new Set()
      for (const q of data.questions) {
        if (!q || typeof q.id !== 'string' || typeof q.question !== 'string' || ids.has(q.id)) return null
        ids.add(q.id)
        if (q.options !== undefined && (!Array.isArray(q.options) || q.options.some(o => !o || typeof o.label !== 'string' || (o.description !== undefined && typeof o.description !== 'string')))) return null
      }
      return data.questions
    }
    const button = { padding: '7px 12px', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 7, background: 'var(--dsw-alias-bg-layer-1)', color: 'inherit', cursor: 'pointer' }
    function Recovery({ questions, send, callId, sessionId, inspect }) {
      const [answers, setAnswers] = React.useState({})
      const [busy, setBusy] = React.useState(false)
      const [sent, setSent] = React.useState(false)
      const [error, setError] = React.useState('')
      const lock = React.useRef(false)
      function update(id, value) { setAnswers(previous => ({ ...previous, [id]: { ...previous[id], ...value } })) }
      const ready = questions.every(q => answers[q.id]?.selected?.length || answers[q.id]?.custom?.trim())
      async function submit() {
        if (lock.current || sent || !ready) return
        lock.current = true; setBusy(true); setError('')
        const response = questions.map(q => ({ id: q.id, question: q.question, selected: answers[q.id]?.selected || [], custom: answers[q.id]?.custom?.trim() || '' }))
        try {
          await send(`补充回答已中断的提问（工具调用 ${callId}）：\n${JSON.stringify({ answers: response }, null, 2)}\n请根据这些回答继续。原提问工具的中断记录保持不变。`)
          setSent(true)
        } catch (failure) { setError(failure.message || '发送失败，请检查会话连接') }
        finally { lock.current = false; setBusy(false) }
      }
      return h('section', { 'aria-label': '中断提问补充回答', style: { padding: 14, border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 10, color: 'var(--dsw-alias-label-primary)', background: 'var(--dsw-alias-bg-layer-1)' } },
        h('strong', null, '提问已中断'),
        h('p', null, sent ? '补充回答已发送到原会话。' : '选择或填写答案后，作为新消息发送到此会话。'),
        ...questions.map(q => h('fieldset', { key: q.id, disabled: busy || sent, style: { border: 0, padding: '8px 0', minWidth: 0 } },
          h('legend', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, q.question),
          ...(q.options || []).map((option, index) => h('label', { key: index, style: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0', cursor: 'pointer' } },
            h('input', { type: q.multi_select ? 'checkbox' : 'radio', name: `${sessionId}:${callId}:${q.id}`, checked: (answers[q.id]?.selected || []).includes(option.label), onChange: event => {
              const selected = answers[q.id]?.selected || []
              update(q.id, { selected: q.multi_select ? (event.target.checked ? [...selected, option.label] : selected.filter(value => value !== option.label)) : [option.label] })
            } }),
            h('span', null, h('span', null, option.label), option.description ? h('small', { style: { display: 'block', opacity: .75, marginTop: 3 } }, option.description) : null))),
          h('textarea', { 'aria-label': `${q.question}：补充回答`, placeholder: '其他答案或补充说明', value: answers[q.id]?.custom || '', onChange: event => update(q.id, { custom: event.target.value }), style: { width: '100%', boxSizing: 'border-box', minHeight: 64, color: 'inherit', background: 'var(--dsw-alias-bg-base)', border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 6, padding: 8 } }))),
        error ? h('p', { role: 'alert' }, error) : null,
        h('button', { style: button, disabled: !ready || busy || sent, onClick: submit }, busy ? '正在发送…' : sent ? '已发送' : '发送补充回答'),
        inspect ? h('button', { style: { ...button, marginLeft: 8 }, onClick: inspect }, '查看原始记录') : null)
    }
    return {
      inject: ['slots', 'sessions', 'conversation'],
      apply(ctx) {
        ctx.slots.inject('tool.call.toolview', () => {
          const original = ctx.slots.entries('tool.call.toolview').find(entry => entry.options.key === 'ask_user_question')
          if (!original) throw new Error('question-recovery requires the official ask_user_question view')
          return ctx.slots.register({ name: 'tool.call.toolview', key: 'ask_user_question', priority: -20, locale: 'conversation', inject(sessionId) {
            return { ...original.inject?.(sessionId), send: text => {
              const scope = ctx.sessions.scope(sessionId)
              if (!scope) throw new Error('原会话尚未加载')
              return scope.conversation.send(text)
            } }
          } }, props => {
            const questions = questionsFor(props.block)
            return questions ? h(Recovery, { ...props, questions, key: `${props.sessionId}:${props.callId}` }) : h(original.component, props)
          })
        })
      },
    }
  },
})
