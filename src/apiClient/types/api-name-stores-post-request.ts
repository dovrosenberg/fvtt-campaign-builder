/* tslint:disable */
/* eslint-disable */
/**
 * fvtt-fcb-backend
 * Backend for advanced capabilities for fvtt-campaign-builder Foundry module
 *
 * The version of the OpenAPI document: 0.0.9
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */



/**
 * 
 * @export
 * @interface ApiNameStoresPostRequest
 */
export interface ApiNameStoresPostRequest {
    /**
     * Number of store names to generate
     * @type {number}
     * @memberof ApiNameStoresPostRequest
     */
    'count': number;
    /**
     * Genre of the setting (e.g., fantasy, sci-fi, western)
     * @type {string}
     * @memberof ApiNameStoresPostRequest
     */
    'genre'?: string | null;
    /**
     * The feeling or atmosphere of the world (e.g., dark, whimsical, gritty)
     * @type {string}
     * @memberof ApiNameStoresPostRequest
     */
    'worldFeeling'?: string | null;
    /**
     * Type of store (e.g., blacksmith, apothecary, general store)
     * @type {string}
     * @memberof ApiNameStoresPostRequest
     */
    'storeType'?: string | null;
    /**
     * The styles of names to use
     * @type {Array<string>}
     * @memberof ApiNameStoresPostRequest
     */
    'nameStyles'?: Array<string>;
}

