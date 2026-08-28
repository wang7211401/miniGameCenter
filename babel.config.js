module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['expo/internal/babel-preset'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
          },
        },
      ],
    ],
  };
};