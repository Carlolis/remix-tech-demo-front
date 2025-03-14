import { Schema as Sc } from 'effect'

export const IArguments = Sc.Union(
  Sc.TaggedStruct('wakeUp', {}),
  Sc.TaggedStruct('ask', {
    message: Sc.String,
    model: Sc.String
  })
)

export type IArguments = typeof IArguments.Type
