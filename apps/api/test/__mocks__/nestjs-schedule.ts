/** Jest 用：避免載入 @nestjs/schedule 的 ESM 套件；測試不依賴真實 cron 排程。 */
export const Cron = (): MethodDecorator => () => undefined;
export const ScheduleModule = {
  forRoot: () => ({
    module: class ScheduleModuleMock {},
    providers: [],
    exports: [],
  }),
};
