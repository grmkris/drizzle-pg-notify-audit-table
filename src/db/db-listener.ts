import {z} from "zod";
import {camelCaseKeys, Comment, Post, RecordVersion} from "./schema.ts";
import {postgresClient} from "./db.ts";

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
