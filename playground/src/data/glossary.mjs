// @ts-check
/**
 * Central glossary for [[Term]] wikilinks. One demo entry of each kind; the
 * theme's remarkGlossary plugin resolves markers at build time and an unknown
 * term fails the build.
 */
export const glossary = {
  comfyui: {
    label: 'ComfyUI',
    stack: 'comfyui',
  },
  diffusion: {
    label: { ko: '디퓨전 모델', en: 'Diffusion model' },
    def: {
      ko: '노이즈에서 이미지를 점진적으로 복원하도록 학습된 생성 모델.',
      en: 'A generative model trained to gradually denoise toward an image.',
    },
  },
};
