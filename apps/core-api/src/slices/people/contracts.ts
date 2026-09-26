import { PersonRequest } from "@luhive/domain/v1/person";
import { z } from "zod";

export const UpsertPersonCommand = PersonRequest.extend({
  communityId: z.uuid(),
});

export type UpsertPersonCommand = z.infer<typeof UpsertPersonCommand>;
