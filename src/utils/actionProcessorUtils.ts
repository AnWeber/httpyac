import { ActionProcessorType, HttpRegion } from '../models';


export function actionProcessorIndexAfterRequest(httpRegion: HttpRegion) {
  return actionProcessorIndexAfter(httpRegion, ActionProcessorType.request);
}

export function actionProcessorIndexAfter(httpRegion: HttpRegion, type: ActionProcessorType) {
  return httpRegion.actions.findIndex(obj => obj.type === type);
}