import { ModelObject } from '../../../src/client';

export const Post: ModelObject = {
  name: "Post",
  entries: {    "id": { optional: false, type: "dbid", unique: false, hasDefaultValue: true, useUpdateTimestamp: false, array: false, defaultValue: {"name":"autoincrement"} },
    "createdAt": { optional: false, type: "datetime", unique: false, hasDefaultValue: true, useUpdateTimestamp: false, array: false, defaultValue: {"name":"now"} },
    "updatedAt": { optional: false, type: "datetime", unique: false, hasDefaultValue: false, useUpdateTimestamp: true, array: false, defaultValue: "" },
    "published": { optional: false, type: "boolean", unique: false, hasDefaultValue: true, useUpdateTimestamp: false, array: false, defaultValue: false },
    "title": { optional: false, type: "string", unique: false, hasDefaultValue: true, useUpdateTimestamp: false, array: false, defaultValue: "ÿ" },
    "author": { optional: true, type: "reference", unique: false, reference: "User", hasDefaultValue: false, useUpdateTimestamp: false, array: false, defaultValue: "" },
  }
}

export const User: ModelObject = {
  name: "User",
  entries: {    "id": { optional: false, type: "dbid", unique: false, hasDefaultValue: true, useUpdateTimestamp: false, array: false, defaultValue: {"name":"autoincrement"} },
    "createdAt": { optional: false, type: "datetime", unique: false, hasDefaultValue: true, useUpdateTimestamp: false, array: false, defaultValue: {"name":"now"} },
    "email": { optional: false, type: "string", unique: true, hasDefaultValue: false, useUpdateTimestamp: false, array: false, defaultValue: "" },
    "name": { optional: true, type: "string", unique: false, hasDefaultValue: false, useUpdateTimestamp: false, array: false, defaultValue: "" },
    "role": { optional: false, type: "enum", unique: false, enum: "Role", hasDefaultValue: true, useUpdateTimestamp: false, array: false, defaultValue: "user" },
    "posts": { optional: false, type: "reference", unique: false, reference: "Post", hasDefaultValue: false, useUpdateTimestamp: false, array: true, defaultValue: "" },
  }
}