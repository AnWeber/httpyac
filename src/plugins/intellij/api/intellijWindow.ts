import { CommonWindow } from './stubs';

export class IntellijWindow implements CommonWindow {
  btoa(bytes: string): string {
    return global.btoa(bytes);
  }

  atob(bytes: string): string {
    return global.atob(bytes);
  }
}
