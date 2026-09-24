import { PersonRequest } from "@luhive/domain/v1/person";
import { Hono } from "hono";
import type { CommunityEnv } from "../../context";
import { respond } from "../../lib/respond";
import { validateJson } from "../../lib/validate-json";
import type { PersonService } from "./person.service";

export function createPeopleRoutes(people: Pick<PersonService, "upsert">) {
  return new Hono<CommunityEnv>().post("/", validateJson(PersonRequest), async (c) => {
    const result = await people.upsert({
      ...c.req.valid("json"),
      communityId: c.get("communityId"),
    });
    return respond(c, result);
  });
}
