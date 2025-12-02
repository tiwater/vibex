
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

const delegateSchema = z.object({
  reasoning: z.string().describe("Explanation of why delegation is needed"),
});

const jsonSchema = zodToJsonSchema(delegateSchema);
console.log(JSON.stringify(jsonSchema, null, 2));
