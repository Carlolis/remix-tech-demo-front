import type { LinksFunction } from 'react-router'
import {
  href,
  Links,
  Meta,
  NavLink,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useNavigate,
  useRouteError
} from 'react-router'

import { Remix } from './runtime/Remix'
import stylesheet from './tailwind.css?url'

export const links: LinksFunction = () => [
  //  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  { rel: 'stylesheet', href: stylesheet }
]

import { HttpServerRequest } from '@effect/platform'
import { pipe } from 'effect'
import * as T from 'effect/Effect'
import { useEffect } from 'react'
import { CookieSessionStorage } from './runtime/CookieSessionStorage'
interface NavigationPros {
  isAuthenticated: boolean
}

const Navigation = ({ isAuthenticated }: NavigationPros) => (
  <nav className="bg-gray-800">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-16">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <NavLink to="/" className="text-white font-bold text-xl">
              Car Share
            </NavLink>
          </div>
          {isAuthenticated && (
            <div className="ml-10 flex items-baseline space-x-4">
              <NavLink
                to={href('/dashboard')}
                className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Tableau de bord
              </NavLink>
              <NavLink
                to={href('/trip/new')}
                className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                Nouveau trajet
              </NavLink>
            </div>
          )}
          <NavLink
            to={href('/ia')}
            className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
          >
            IA
          </NavLink>
        </div>
        <div className="flex items-center">
          {isAuthenticated ?
            (
              <NavLink to={href('/')}>
                <button
                  type="submit"
                  className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Déconnexion
                </button>
              </NavLink>
            ) :
            null}
        </div>
      </div>
    </div>
  </nav>
)

export const loader = Remix.loader(
  T.gen(function* () {
    const cookieSession = yield* CookieSessionStorage

    const request = yield* HttpServerRequest.HttpServerRequest
    const url = yield* HttpServerRequest.toURL(request)

    const isAuthenticated = yield* pipe(
      cookieSession.getUserToken(),
      T.map(_ => true),
      T.catchAll(_ => T.succeed(false))
    )
    return { isAuthenticated, url }
  })
)

export default function App() {
  const { isAuthenticated, url } = useLoaderData<typeof loader>()

  const isIAUrl = url && url.hostname === 'ia.ilieff.fr'
  const navigate = useNavigate()

  useEffect(() => {
    if (isIAUrl) {
      navigate('/ia')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <link rel="icon" href="/favicon.svg" />
        {isIAUrl ? <title>AI by Charles</title> : <title>Partage</title>}
      </head>
      <body>
        <div className="min-h-screen bg-gray-100">
          {!isIAUrl && <Navigation isAuthenticated={isAuthenticated} />}
          <Outlet />
        </div>

        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export function ErrorBoundary() {
  const error = useRouteError()
  // eslint-disable-next-line no-console
  console.error(error)
  return (
    <html lang="fr">
      <head>
        <title>Oh no!</title>
        <Meta />
        <Links />
      </head>
      <body>
        {/* add the UI you want your users to see */}
        <Scripts />
      </body>
    </html>
  )
}
