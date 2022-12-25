type DatabaseId = number;
type DateTime = Date;
type Boolean = boolean;
type String = string;
type Reference<T extends string> = T;
export type Default<T, Value extends T> = T;
type autoincrement = number;
type IdDecorator<T> = T
type now = Date;
type updateTimestamp<T> = Date;
type CharCode<T extends number> = string;
type Optional<T> = T | undefined;
type Unique<T> = T;
type DBEnum<T extends string> = T;

export interface Post {
  name: "Post";
  entries: {
    "id"?: IdDecorator<Default<DatabaseId, autoincrement>>;
    "createdAt"?: Default<DateTime, now>;
    "updatedAt"?: updateTimestamp<DateTime>;
    "published"?: Default<Boolean, false>;
    "title"?: CharCode<String, 255>;
    "author"?: Optional<Reference<User>>;
  }
}


export interface User {
  name: "User";
  entries: {
    "id"?: IdDecorator<Default<DatabaseId, autoincrement>>;
    "createdAt"?: Default<DateTime, now>;
    "email": Unique<String>;
    "name"?: Optional<String>;
    "role"?: Default<Role, "user">;
    "posts"?: Array<Reference<Post>>;
  }
}


export type Role = DBEnum<"USER"|"ADMIN">