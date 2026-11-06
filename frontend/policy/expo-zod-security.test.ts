// @vitest-environment node
import { createRequire } from 'node:module'
import { describe, expect, it } from 'vitest'
import * as z from 'zod'

const require = createRequire(import.meta.url)
const expoRequire = createRequire(require.resolve('@expo/cli/package.json'))
const { PluginSchema, DevToolsPluginOutputSchema } = expoRequire(
  './build/src/start/server/devtools/DevToolsPlugin.schema.js'
) as {
  PluginSchema: unknown
  DevToolsPluginOutputSchema: unknown
}
const { validate } = expoRequire('@expo/schema-utils') as {
  validate: (schema: unknown, value: unknown) => void
}
const { createMCPDevToolsExtensionSchema } = expoRequire(
  './build/src/start/server/mcp/createMCPDevToolsExtensionSchema.js'
) as {
  createMCPDevToolsExtensionSchema: (plugin: unknown, zod: typeof z) => z.ZodType
}

const plugin = {
  packageName: 'test-devtools',
  packageRoot: '/tmp/test-devtools',
  cliExtensions: {
    description: 'Development tools',
    entryPoint: './commands.js',
    commands: [
      {
        name: 'inspect',
        title: 'Inspect the app',
        environments: ['cli', 'mcp'],
        parameters: [
          { name: 'query', type: 'text' },
          { name: 'limit', type: 'number' },
          { name: 'confirm', type: 'confirm' },
        ],
      },
    ],
  },
}

describe('Expo CLI plugin validation and MCP schema compatibility', () => {
  it('uses the patched Zod parser that rejects oversized collections before visiting elements', () => {
    let visited = 0
    const schema = z
      .array(
        z.unknown().transform(() => {
          visited += 1
          return 'parsed'
        })
      )
      .max(2)

    expect(schema.safeParse([1, 2, 3]).success).toBe(false)
    expect(visited).toBe(0)
  })

  it('parses valid plugin metadata and rejects invalid command parameter types', () => {
    expect(() => validate(PluginSchema, plugin)).not.toThrow()
    expect(() =>
      validate(PluginSchema, {
        ...plugin,
        cliExtensions: {
          ...plugin.cliExtensions,
          commands: [
            { ...plugin.cliExtensions.commands[0], parameters: [{ name: 'x', type: 'bad' }] },
          ],
        },
      })
    ).toThrow()
  })

  it('creates a strict MCP command schema with text, number, and confirmation parameters', () => {
    validate(PluginSchema, plugin)
    const schema = createMCPDevToolsExtensionSchema(plugin, z)
    const command = { command: 'inspect', query: 'screen', limit: 5, confirm: true }

    expect(schema.parse(command)).toEqual(command)
    expect(schema.safeParse({ command: 'inspect' }).success).toBe(true)
    expect(schema.safeParse({ ...command, command: 'unknown' }).success).toBe(false)
    expect(schema.safeParse({ ...command, limit: 'five' }).success).toBe(false)
    expect(schema.safeParse({ ...command, extra: true }).success).toBe(false)
    expect(z.toJSONSchema(schema)).toMatchObject({
      type: 'object',
      additionalProperties: false,
      required: ['command'],
      properties: {
        command: { type: 'string', enum: ['inspect'] },
        query: { type: 'string' },
        limit: { type: 'number' },
        confirm: { type: 'boolean' },
      },
    })
  })

  it('parses CLI extension output and rejects invalid output fields', () => {
    const output = [
      { type: 'text', text: 'Ready', level: 'info' },
      { type: 'image', url: 'https://example.com/screen.png', text: 'Screen' },
      { type: 'audio', url: 'https://example.com/audio.wav' },
    ]

    expect(() => validate(DevToolsPluginOutputSchema, output)).not.toThrow()
    expect(() => validate(DevToolsPluginOutputSchema, [{ type: 'image', url: 42 }])).toThrow()
    expect(() =>
      validate(DevToolsPluginOutputSchema, [{ type: 'text', text: 'Ready', level: 'bad' }])
    ).toThrow()
  })
})
