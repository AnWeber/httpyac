import { ActionProcessorType, HttpRegion } from '../models';


export function actionProcessorIndexAfterRequest(httpRegion: HttpRegion) {
  return actionProcessorIndexAfter(httpRegion, ActionProcessorType.request) + 1;
}

export function actionProcessorIndexAfter(httpRegion: HttpRegion, type: ActionProcessorType) {
  return httpRegion.actions.findIndex(obj => obj.type === type);
}