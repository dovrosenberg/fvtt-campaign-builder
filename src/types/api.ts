import type { ApiCharacterGenerateImagePostRequest } from '@/apiClient/types';

// Assume all text and image models share the same enum types across all requests.
// We use ApiCharacterGenerateImagePostRequest as it's guaranteed to have both.
export type TextModel = ApiCharacterGenerateImagePostRequest['textModel'];
export type ImageModel = ApiCharacterGenerateImagePostRequest['imageModel'];

/**
 * A helper type that takes a request type `T` and removes the model properties
 * that will be injected automatically by the FCBApiWrapper.
 */
export type InjectedRequest<T> = Omit<T, 'textModel' | 'imageModel'>;
