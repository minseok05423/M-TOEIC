import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import stylex from '@stylexjs/unplugin'

/**
 * Astryx components come prebuilt (@astryxdesign/core/astryx.css, in the astryx-base layer).
 * StyleX here compiles only our own stylex.create() styles (src/ui/*, src/components/*),
 * which use Astryx tokens (var(--color-*), var(--spacing-*)).
 *
 * Our classes use the 'mt' prefix, Astryx's use 'x' (see classNamePrefix below).
 * The StyleX plugin would also transform installed packages that use StyleX (Astryx itself) and emit
 * their rules unlayered, which beats the theme layer. So it only sees files under src/.
 */
function ownSourceOnly(plugin: Plugin): Plugin {
  const t = plugin.transform
  if (!t) return plugin
  const handler = (typeof t === 'function' ? t : t.handler) as (this: unknown, ...a: unknown[]) => unknown
  const transform = function (this: unknown, code: string, id: string, ...rest: unknown[]) {
    if (id.includes('/node_modules/') || !id.includes('/src/')) return null
    return handler.call(this, code, id, ...rest)
  }
  return { ...plugin, transform: transform as Plugin['transform'] }
}

const stylexPlugins = ([] as Plugin[]).concat(
  stylex.vite({
    dev: process.env.NODE_ENV !== 'production',
    runtimeInjection: false,
    // Astryx's prebuilt classes use the default 'x' prefix. Same declaration = same atomic class name,
    // so our own classes get their own prefix and never collide with (or override) Astryx's.
    classNamePrefix: 'mt',
    treeshakeCompensation: true,
    unstable_moduleResolution: { type: 'commonJS', rootDir: import.meta.dirname },
  }),
)

export default defineConfig({
  plugins: [...stylexPlugins.map(ownSourceOnly), react()],
})
