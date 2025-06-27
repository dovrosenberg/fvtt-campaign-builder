// Imports for request/response types
import type {
  ApiCharacterGenerateImagePostRequest,
  ApiCharacterGeneratePostRequest,
  ApiLocationGenerateImagePostRequest,
  ApiLocationGeneratePostRequest,
  ApiNameCharactersPostRequest,
  ApiNamePreviewPostRequest,
  ApiNameStoresPostRequest,
  ApiNameTavernsPostRequest,
  ApiNameTownsPostRequest,
  ApiOrganizationGenerateImagePostRequest,
  ApiOrganizationGeneratePostRequest,
} from '@/apiClient/types';

// Other imports
import type { RawAxiosRequestConfig, AxiosPromise, } from 'axios';
import { FCBApi } from '@/apiClient';
import { Backend } from './Backend';
import { InjectedRequest } from '@/types/api';

export class FCBApiWrapper implements Partial<FCBApi> {
  private realApi: FCBApi;

  constructor(realApi: FCBApi) {
    this.realApi = realApi;
  }

  // --- Methods that inject textModel/imageModel ---
  public apiCharacterGenerateImagePost(
    req: InjectedRequest<ApiCharacterGenerateImagePostRequest>,
    options?: RawAxiosRequestConfig,
  ): ReturnType<typeof this.realApi.apiCharacterGenerateImagePost> {
    const fullReq = req as ApiCharacterGenerateImagePostRequest;
    fullReq.textModel = Backend.textModel;
    fullReq.imageModel = Backend.imageModel;
    return this.realApi.apiCharacterGenerateImagePost(fullReq, options);
  }

  public apiCharacterGeneratePost(
    req: InjectedRequest<ApiCharacterGeneratePostRequest>,
    options?: RawAxiosRequestConfig,
  ): ReturnType<typeof this.realApi.apiCharacterGeneratePost> {
    const fullReq = req as ApiCharacterGeneratePostRequest;
    fullReq.textModel = Backend.textModel;
    return this.realApi.apiCharacterGeneratePost(fullReq, options);
  }

  public apiLocationGenerateImagePost(
    req: InjectedRequest<ApiLocationGenerateImagePostRequest>,
    options?: RawAxiosRequestConfig,
  ): ReturnType<typeof this.realApi.apiLocationGenerateImagePost> {
    const fullReq = req as ApiLocationGenerateImagePostRequest;
    fullReq.textModel = Backend.textModel;
    fullReq.imageModel = Backend.imageModel;
    return this.realApi.apiLocationGenerateImagePost(fullReq, options);
  }

  public apiLocationGeneratePost(
    req: InjectedRequest<ApiLocationGeneratePostRequest>,
    options?: RawAxiosRequestConfig,
  ): ReturnType<typeof this.realApi.apiLocationGeneratePost> {
    const fullReq = req as ApiLocationGeneratePostRequest;
    fullReq.textModel = Backend.textModel;
    return this.realApi.apiLocationGeneratePost(fullReq, options);
  }

  public apiNameCharactersPost(
    req: InjectedRequest<ApiNameCharactersPostRequest>,
    options?: RawAxiosRequestConfig,
  ): ReturnType<typeof this.realApi.apiNameCharactersPost> {
    const fullReq = req as ApiNameCharactersPostRequest;
    fullReq.textModel = Backend.textModel;
    return this.realApi.apiNameCharactersPost(fullReq, options);
  }

  public apiNamePreviewPost(
    req: ApiNamePreviewPostRequest,
    options?: RawAxiosRequestConfig,
  ): ReturnType<typeof this.realApi.apiNamePreviewPost> {
    return this.realApi.apiNamePreviewPost(req, options);
  }

  public apiNameStoresPost(
    req: InjectedRequest<ApiNameStoresPostRequest>,
    options?: RawAxiosRequestConfig,
  ): ReturnType<typeof this.realApi.apiNameStoresPost> {
    const fullReq = req as ApiNameStoresPostRequest;
    fullReq.textModel = Backend.textModel;
    return this.realApi.apiNameStoresPost(fullReq, options);
  }

  public apiNameTavernsPost(
    req: InjectedRequest<ApiNameTavernsPostRequest>,
    options?: RawAxiosRequestConfig,
  ): ReturnType<typeof this.realApi.apiNameTavernsPost> {
    const fullReq = req as ApiNameTavernsPostRequest;
    fullReq.textModel = Backend.textModel;
    return this.realApi.apiNameTavernsPost(fullReq, options);
  }

  public apiNameTownsPost(
    req: InjectedRequest<ApiNameTownsPostRequest>,
    options?: RawAxiosRequestConfig,
  ): ReturnType<typeof this.realApi.apiNameTownsPost> {
    const fullReq = req as ApiNameTownsPostRequest;
    fullReq.textModel = Backend.textModel;
    return this.realApi.apiNameTownsPost(fullReq, options);
  }

  public apiOrganizationGenerateImagePost(
    req: InjectedRequest<ApiOrganizationGenerateImagePostRequest>,
    options?: RawAxiosRequestConfig,
  ): ReturnType<typeof this.realApi.apiOrganizationGenerateImagePost> {
    const fullReq = req as ApiOrganizationGenerateImagePostRequest;
    fullReq.textModel = Backend.textModel;
    fullReq.imageModel = Backend.imageModel;
    return this.realApi.apiOrganizationGenerateImagePost(fullReq, options);
  }

  public apiOrganizationGeneratePost(
    req: InjectedRequest<ApiOrganizationGeneratePostRequest>,
    options?: RawAxiosRequestConfig,
  ): ReturnType<typeof this.realApi.apiOrganizationGeneratePost> {
    const fullReq = req as ApiOrganizationGeneratePostRequest;
    fullReq.textModel = Backend.textModel;
    return this.realApi.apiOrganizationGeneratePost(fullReq, options);
  }

  // --- Methods that do not take models ---
  public apiPollEmailTodoGet(options?: RawAxiosRequestConfig): ReturnType<typeof this.realApi.apiPollEmailTodoGet> {
    return this.realApi.apiPollEmailTodoGet(options);
  }

  public apiVersionGet(options?: RawAxiosRequestConfig): ReturnType<typeof this.realApi.apiVersionGet> {
    return this.realApi.apiVersionGet(options);
  }

  public apiModelsTextGet(options?: RawAxiosRequestConfig): ReturnType<typeof this.realApi.apiModelsTextGet> {
    return this.realApi.apiModelsTextGet(options);
  }

  public apiModelsImageGet(options?: RawAxiosRequestConfig): ReturnType<typeof this.realApi.apiModelsImageGet> {
    return this.realApi.apiModelsImageGet(options);
  }
}
