import { HttpServerRequest } from '@effect/platform'

// import { json, TypedResponse } from 'react-router';
import { Context, Effect as T, pipe, Schema as Sc } from 'effect'
import { stringify } from 'effect/FastCheck'
import * as O from 'effect/Option'
import { redirect } from 'react-router'
import { SessionStorage } from '~/session'
import { NotAuthenticated } from './errors/NotAuthenticatedError'
import { ServerResponse } from './ServerResponse'

const UserInfo = Sc.Struct({
  username: Sc.String,
  token: Sc.String
})

type UserInfo = Sc.Schema.Type<typeof UserInfo>

export class CookieSessionStorage
  extends T.Service<CookieSessionStorage>()('CookieSessionStorage', {
    effect: T.gen(function* (_) {
      const optionalCookies: O.Option<string> = yield* _(
        HttpServerRequest.schemaHeaders(Sc.Struct({ cookie: Sc.String })),
        T.mapError(e => NotAuthenticated.of(e.message)),
        T.map(headers => O.some(headers.cookie)),
        T.tapError(e =>
          T.logError(`CookieSessionStorage - get cookies for service not found`, e.message)
        ),
        T.catchAll(() => T.succeed(O.none()))
      )

      const { commitSession, getSession } = yield* SessionStorage

      const commitUserInfo = (userInfo: UserInfo) =>
        T.gen(function* (_) {
          yield* T.logDebug(
            `CookieSessionStorage - commitUserInfo about to commit user info:`,
            stringify(userInfo),
            stringify(optionalCookies)
          )

          const session = yield* _(T.promise(() =>
            pipe(
              optionalCookies,
              O.getOrUndefined,
              cookies =>
                getSession(
                  cookies
                )
            )
          ))
          yield* T.logDebug(`CookieSessionStorage - commitUserInfo`, userInfo, session)

          session.set('user_info', userInfo)

          const cookie = yield* _(T.promise(() => commitSession(session)))

          return redirect('/dashboard', { headers: { 'Set-Cookie': cookie } })
        }).pipe(
          T.annotateLogs('Cookie Session', commitUserInfo.name)
        )

      const getUserToken = () =>
        T.gen(function* (_) {
          yield* T.logDebug('Getting user token')

          const cookies = yield* _(
            optionalCookies,
            T.catchAll(() =>
              ServerResponse.Redirect({
                location: '/login'
              })
            )
          )
          yield* T.logInfo('Getting user session from cookies', cookies)
          const session = yield* _(T.promise(() =>
            getSession(
              cookies
            )
          ))
          yield* T.logInfo('Getting user info', session.get('user_info'))

          const token = yield* _(
            session.get('user_info'),
            Sc.decodeUnknown(UserInfo),
            T.map(({ token }) => token),
            T.mapError(e => NotAuthenticated.of(e.message)),
            T.tapError(e => T.logError(`CookieSessionStorage - getUserToken`, e)),
            T.catchAll(() =>
              ServerResponse.Redirect({
                location: '/login'
              })
            )
          )
          yield* T.logInfo('User token found', token)

          return token
        }).pipe(
          T.annotateLogs('Cookie Session', getUserToken.name)
        )
      const getUserName = () =>
        T.gen(function* (_) {
          yield* T.logDebug('Getting user name')

          const session = yield* _(
            optionalCookies,
            T.flatMap(cookies =>
              T.promise(() =>
                getSession(
                  cookies
                )
              )
            )
          )

          return yield* _(
            session.get('user_info'),
            Sc.decodeUnknown(UserInfo),
            T.map(({ username }) => username)
          )
        }).pipe(
          T.annotateLogs('Cookie Session', getUserName.name)
        )

      // Correction de la fonction logout pour gérer correctement la suppression de la session utilisateur
      const logout = () =>
        T.gen(function* (_) {
          const cookies = yield* _(optionalCookies, T.catchAll(() => T.succeed(undefined)))
          const session = yield* _(T.promise(() => getSession(cookies)))
          session.unset('user_info')
          const cookie = yield* _(T.promise(() => commitSession(session)))
          return redirect('/', { headers: { 'Set-Cookie': cookie } })
        }).pipe(
          T.annotateLogs('Cookie Session', logout.name)
        )

      return {
        getUserToken,
        getUserName,
        commitUserInfo,
        logout
      }
    })
  }) {}

export class CookieSession
  extends Context.Tag('CookieSessionStorage')<CookieSessionStorage, CookieSessionStorage>() {
}

export const CookieSessionStorageLayer = CookieSessionStorage.Default
