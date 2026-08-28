// src/games/puzzle/styles.js（保持不变）
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  board: {
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tile: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  info: {
    position: 'absolute',
    top: 50,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  button: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#2ed573',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successText: {
    color: '#ffd700',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
  },
});