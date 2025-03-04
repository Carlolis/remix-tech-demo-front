import { HttpServerRequest } from '@effect/platform'
import { Config, pipe, Schema as Sc } from 'effect'
import * as A from 'effect/Array'
import * as T from 'effect/Effect'
import * as O from 'effect/Option'
import { Unexpected } from 'effect/ParseResult'
import { MessageSquareDiff } from 'lucide-react'
import { Ollama } from 'ollama'
import { useEffect, useState } from 'react'
import { Form, useActionData } from 'react-router'
import { Chat } from '~/components/ia/Chat'
import { Info } from '~/components/ia/Info'

import { ModelSelect } from '~/components/ia/Select'
import type { ChatChunk } from '~/contexts/ia.util'
import { streamResponse } from '~/contexts/ia.util'
import { Remix } from '~/runtime/Remix'

export const action = Remix.action(
  T.gen(function* () {
    const { message, model } = yield* HttpServerRequest.schemaBodyForm(
      Sc.Struct({
        message: Sc.String,
        model: Sc.String
      })
    )
    const ollamaHost = yield* pipe(
      Config.string('OLLAMA_HOST'),
      Config.withDefault('localhost:11434')
    )

    yield* T.logInfo(`Ollama Host: ${ollamaHost}`)
    yield* T.logInfo(`Ollama Model: ${model}`)

    const ollama = new Ollama({
      host: ollamaHost
    })

    const chatResponse = yield* pipe(
      T.promise(() =>
        ollama.chat({
          model,
          messages: [{ content: message, role: 'user' }],
          stream: true
        })
      ),
      T.map(streamResponse)
    )

    return chatResponse
  }).pipe(
    T.scoped,
    T.tapError(T.logError),
    T.catchAll(error => T.fail(new Unexpected(error)))
  )
)

export default function IA() {
  const actionData = useActionData<typeof action>()

  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [responses, setAIResponses] = useState<{ response: O.Option<string>; question: string }[]>(
    []
  )
  const [isWritingResponse, setIsWritingResponse] = useState<boolean>(false)
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [chatHistory, setChatHistory] = useState<{ question: string; response: string }[]>([
    { question: 'Hello', response: 'Hi there!' },
    { question: 'How are you?', response: 'I am good, thank you!' }
  ])

  useEffect(() => {
    if (actionData) {
      const handleChatChunk = (chat: ChatChunk) => {
        if (chat.type === 'text') {
          setIsWritingResponse(true)

          setIsLoading(false)
          setAIResponses(contents => {
            const lastContents: {
              question: string
              response: O.Option<string>
            } = pipe(
              A.last(contents),
              O.map(({ question, response }) => ({
                question,
                response: pipe(
                  response,
                  O.match({
                    onNone: () => O.some(chat.content),
                    onSome: response => O.some(response + chat.content)
                  })
                )
              })),
              O.getOrElse(() => ({ question: '', response: O.none() }))
            )
            const contentsWithoutLast = A.dropRight(contents, 1)

            return [...contentsWithoutLast, lastContents]
          })
          chat.next?.then(nextChat => {
            handleChatChunk(nextChat)
          })
        }
        if (chat.type === 'done') {
          setIsWritingResponse(false)
        }
      }
      handleChatChunk(actionData)
    }
  }, [actionData])

  return (
    <div className="flex bg-white dark:bg-gray-900 space-x-4">
      <div className="min-h-screen w-1/4 p-4 bg-gray-100 dark:bg-gray-800 h-full border-r border-gray-300 dark:border-gray-700 flex flex-col">
        <div>
          <button
            className="bg-white text-blue-500 px-4 py-1 rounded my-2 flex items-center space-x-2 hover:bg-blue-500 hover:text-white transition-colors duration-300"
            onClick={() => {
              setChatHistory([])
            }}
          >
            <MessageSquareDiff className="w-5 h-5" />
            <div>Nouveau Chat</div>
          </button>
        </div>

        <ul className=" space-y-2 flex-grow overflow-y-auto">
          {chatHistory.map((chat, index) => (
            <li key={index} className="p-2 bg-white dark:bg-gray-700 rounded">
              <p className="font-bold">Question: {chat.question}</p>
              <p>Réponse: {chat.response}</p>
            </li>
          ))}
        </ul>
      </div>
      <div className="w-3/4  space-y-8 p-16">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            Demandez à l&apos;IA
          </h2>
        </div>
        <Form
          className="mt-8 space-y-6"
          method="post"
          onSubmit={event => {
            const form = event.currentTarget

            const question = (form.elements.namedItem('message') as HTMLTextAreaElement).value

            setAIResponses(responses => [...responses, { question, response: O.none() }])
            setIsLoading(true)

            setTimeout(() => {
              const messageInput = form.elements.namedItem('message') as HTMLTextAreaElement
              messageInput.value = ''
            })
          }}
        >
          <ModelSelect setSelectedModel={setSelectedModel} />

          <Chat
            isLoading={isLoading}
            responses={responses}
            selectedModel={selectedModel}
            isWritingResponse={isWritingResponse}
          />
        </Form>
        <Info />
      </div>
    </div>
  )
}
