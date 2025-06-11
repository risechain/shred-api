import type { ErrorType } from '../../errors/utils.js'
import { withResolvers, type PromiseWithResolvers } from './withResolvers'

type Resolved<returnType extends readonly unknown[] = any> = [
  result: returnType[number],
  results: returnType,
]

type SchedulerItem = {
  args: unknown
  resolve: PromiseWithResolvers<unknown>['resolve']
  reject: PromiseWithResolvers<unknown>['reject']
}

type BatchResultsCompareFn<result = unknown> = (a: result, b: result) => number

type CreateBatchSchedulerArguments<
  parameters = unknown,
  returnType extends readonly unknown[] = readonly unknown[],
> = {
  fn: (args: parameters[]) => Promise<returnType>
  id: number | string
  shouldSplitBatch?: ((args: parameters[]) => boolean) | undefined
  wait?: number | undefined
  sort?: BatchResultsCompareFn<returnType[number]> | undefined
}

type CreateBatchSchedulerReturnType<
  parameters = unknown,
  returnType extends readonly unknown[] = readonly unknown[],
> = {
  flush: () => void
  schedule: parameters extends undefined
    ? (args?: parameters | undefined) => Promise<Resolved<returnType>>
    : (args: parameters) => Promise<Resolved<returnType>>
}

export type CreateBatchSchedulerErrorType = ErrorType

const schedulerCache = /*#__PURE__*/ new Map<number | string, SchedulerItem[]>()

/** @internal */
export function createBatchScheduler<
  parameters,
  returnType extends readonly unknown[],
>({
  fn,
  id,
  shouldSplitBatch,
  wait = 0,
  sort,
}: CreateBatchSchedulerArguments<
  parameters,
  returnType
>): CreateBatchSchedulerReturnType<parameters, returnType> {
  const exec = () => {
    const scheduler = getScheduler()
    flush()

    const args = scheduler.map(({ args }) => args)

    if (args.length === 0) return

    fn(args as parameters[])
      .then((data) => {
        if (sort && Array.isArray(data)) data.sort(sort)
        for (const [i, { resolve }] of scheduler.entries()) {
          resolve?.([data[i], data])
        }
      })
      .catch((error) => {
        for (const { reject } of scheduler) {
          reject?.(error)
        }
      })
  }

  const flush = () => schedulerCache.delete(id)

  const getBatchedArgs = () =>
    getScheduler().map(({ args }) => args) as parameters[]

  const getScheduler = () => schedulerCache.get(id) || []

  const setScheduler = (item: SchedulerItem) =>
    schedulerCache.set(id, [...getScheduler(), item])

  return {
    flush,
    schedule(args: parameters) {
      const { promise, resolve, reject } = withResolvers()

      const split = shouldSplitBatch?.([...getBatchedArgs(), args])

      if (split) exec()

      const hasActiveScheduler = getScheduler().length > 0
      if (hasActiveScheduler) {
        setScheduler({ args, resolve, reject })
        return promise
      }

      setScheduler({ args, resolve, reject })
      setTimeout(exec, wait)
      return promise
    },
  } as unknown as CreateBatchSchedulerReturnType<parameters, returnType>
}
