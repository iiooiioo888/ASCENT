/** Jest 用：避免載入 @nestjs/schedule 的 ESM 套件；提供 SchedulerRegistry 供 SettlementCronService 注入。 */
export const Cron = (): MethodDecorator => () => undefined;

type IntervalHandle = ReturnType<typeof setInterval>;

export class SchedulerRegistry {
  private readonly intervals = new Map<string, IntervalHandle>();

  doesExist(type: string, name: string): boolean {
    return type === "interval" && this.intervals.has(name);
  }

  getInterval<T = IntervalHandle>(name: string): T {
    const handle = this.intervals.get(name);
    if (!handle) throw new Error(`Interval ${name} not found`);
    return handle as T;
  }

  addInterval(name: string, handle: IntervalHandle): void {
    this.intervals.set(name, handle);
  }

  deleteInterval(name: string): void {
    this.intervals.delete(name);
  }
}

export const ScheduleModule = {
  forRoot: () => ({
    module: class ScheduleModuleMock {},
    global: true,
    providers: [SchedulerRegistry],
    exports: [SchedulerRegistry],
  }),
};
