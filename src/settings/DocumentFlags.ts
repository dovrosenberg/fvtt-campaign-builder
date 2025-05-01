// handles flags set on the world root folder
// we store all the compendia status info here in the hopes that it's stored on the server, though that's unclear to me
// also, when the world is deleted, they'll all get cleaned up

/** 
 * The subset of FK (which should be an enum of keys) that are Record<string, any> 
 **/
type ProtectedKeys<FK extends string, FT extends { [K in FK]: any }> = {
  [K in FK]: FT extends { [K in FK]: infer KeyType }
    ? KeyType extends Record<string, any>
      ? 1
      : never
      : never
}[FK];


/**
 * Specify that settings have to be keyedByUUID if the're protected
 */
export type FlagSettings<FK extends string, FT extends { [K in FK]: any }> = {
  [K in FK]: FT extends { [K in FK]: infer KeyType }
  ? K extends ProtectedKeys<FK, FT>
    ?
    {
      flagId: K;
      default: KeyType;

      // is it a Record<uuid, ...>?  this will properly handle the '.'s
      keyedByUUID?: true;
    } :
    {
      flagId: K;
      default: KeyType;

      keyedByUUID?: false;
    }
  : never
}[FK];

