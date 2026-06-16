CREATE TABLE "rekoved_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" varchar(512) NOT NULL,
	"revoked_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "rekoved_tokens_token_unique" UNIQUE("token")
);
