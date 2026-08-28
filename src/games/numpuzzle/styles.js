// src/games/numpuzzle/styles.js
import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#1e1e2e',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e1e2e',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  moves: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 16,
  },
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#2a2a3a',
    borderRadius: 8,
    padding: 4,
  },
  tile: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3a3a4a',
  },
  numberTile: {
    backgroundColor: '#4e4e6e',
  },
  emptyTile: {
    backgroundColor: 'transparent',
  },
  tileText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  resetButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#2ed573',
    borderRadius: 8,
  },
  resetText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    zIndex: 10,
  },
  completionPanel: {
    width: '84%',
    maxWidth: 340,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  completionTitle: {
    color: '#2d2d44',
    fontSize: 24,
    fontWeight: 'bold',
  },
  completionMessage: {
    marginTop: 8,
    color: '#666',
    fontSize: 16,
  },
  completionStars: {
    marginTop: 12,
    color: '#f5b700',
    fontSize: 28,
  },
  completionActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  completionButton: {
    minWidth: 110,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 8,
    alignItems: 'center',
  },
  listButton: {
    backgroundColor: '#74788c',
  },
  nextButton: {
    backgroundColor: '#2ed573',
  },
  completionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});