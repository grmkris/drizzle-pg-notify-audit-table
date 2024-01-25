import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema.ts";
import { Post, Comment } from "./schema.ts";
import { z } from "zod";
import { camelCaseKeys } from "./schema.ts";
import { RecordVersion } from "./schema.ts";

export const migrationClient = postgres(
  "postgres://postgres:postgres@0.0.0.0:6782/postgres",
  { max: 1 },
);

const postgresClient = postgres(
  "postgres://postgres:postgres@0.0.0.0:6782/postgres",
);
export const db = drizzle(postgresClient, { schema });

export const ChannelMap = {
  new_posts: z.preprocess(camelCaseKeys, Post),
  new_comments: z.preprocess(camelCaseKeys, Comment),
  audit_changes: z.preprocess(camelCaseKeys, RecordVersion),
};

export type ChannelMap = typeof ChannelMap;

type ListenerConfig<Channel extends keyof ChannelMap> = {
  channel: Channel;
  onNotify: (payload: z.infer<ChannelMap[Channel]>) => void;
  onListen: () => void;
};

export const getDBListener = <Channel extends keyof ChannelMap>(
  props: ListenerConfig<Channel>,
) => {
  return postgresClient.listen(
    props.channel,
    (payloadString) => {
      const payload = ChannelMap[props.channel].parse(
        JSON.parse(payloadString),
      );
      props.onNotify(payload);
    },
    props.onListen,
  );
};
