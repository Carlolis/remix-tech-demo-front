import { HttpServerRequest } from '@effect/platform'
import { Match } from 'effect'
import * as T from 'effect/Effect'
import { stringify } from 'effect/FastCheck'
import { useEffect, useState } from 'react'
import { Form, useActionData } from 'react-router'
import { Checkbox } from '~/components/ui/checkbox'
import { Label } from '~/components/ui/label'
import { Remix } from '~/runtime/Remix'
import { Redirect } from '~/runtime/ServerResponse'
import { ApiService } from '~/services/api'
import { TripCreate } from '~/types/api'

export const action = Remix.action(
  T.gen(function* () {
    yield* T.logInfo(`Creating Trip....`)

    const api = yield* ApiService

    const tripCreate = yield* HttpServerRequest.schemaBodyForm(
      TripCreate
    )

    yield* T.logInfo(`Creating Trip.... ${stringify(tripCreate)}`)
    const tripId = yield* api.createTrip(tripCreate)
    yield* T.logInfo(`Trip created .... ${stringify(tripId)}`)
    return { tripId }
  }).pipe(
    T.tapError(T.logError),
    T.catchAll(() => new Redirect({ location: '/trip/new' }))
  )
)

export default function CreateTrip() {
  const actionData = useActionData<typeof action>()

  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined)
  const [tripInfos, setTripInfos] = useState<string | undefined>(undefined)

  useEffect(() => {
    const match = Match.type<typeof actionData>().pipe(
      Match.when(
        undefined,
        () => setErrorMessage('Une erreur est survenue lors de la création du trajet')
      ),
      Match.orElse(({ tripId }) => {
        setTripInfos(tripId)
      })
    )
    match(actionData)
  }, [actionData])

  const personnes = [
    { id: 'maé' as const, name: 'Maé' },
    { id: 'charles' as const, name: 'Charles' },
    { id: 'brigitte' as const, name: 'Brigitte' }
  ]

  return (
    <div className="max-w-md mx-auto mt-10 px-4">
      <h2 className="text-2xl font-bold mb-6">Créer un nouveau trajet</h2>

      {
        /* {errorMessage && (
        <div className="mb-4 p-4 text-red-700 bg-red-100 rounded">
          {errorMessage}
        </div>
      )} */
      }
      {tripInfos && (
        <div className="mb-4 p-4 text-green-700 bg-green-100 rounded">
          {tripInfos}
        </div>
      )}

      <Form
        method="post"
        className="space-y-6"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Quoi ?
            <input
              type="text"
              name="name"
              required
              className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-100 text-gray-900  "
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Début

            <input
              type="date"
              name="startDate"
              required
              defaultValue={new Date().toISOString().split('T')[0]}
              className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-100 text-gray-900  "
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Fin

            <input
              type="date"
              name="endDate"
              required
              defaultValue={new Date().toISOString().split('T')[0]}
              className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-100 text-gray-900  "
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Distance (km)

            <input
              type="number"
              name="distance"
              required
              min="0"
              step="0.1"
              className="mt-1 block w-full px-3 py-2 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 bg-gray-100 text-gray-900  "
            />
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Qui ?
            <div className="flex flex-col gap-2">
              {personnes.map(personne => (
                <div key={personne.id} className="flex items-center gap-3">
                  <Checkbox
                    name="drivers"
                    value={personne.id}
                  />
                  <Label htmlFor="toggle">{personne.name}</Label>
                </div>
              ))}
            </div>
          </label>
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 hover:cursor-pointer"
        >
          Créer le trajet
        </button>
      </Form>
    </div>
  )
}
