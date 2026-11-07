/**
 * The signed-in user on whose behalf a domain module acts. Server actions
 * resolve the session into an Actor and pass it to the module.
 */
export type Actor = {
  readonly id: string;
  readonly name: string;
};
