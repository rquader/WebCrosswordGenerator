import java.awt.Point;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.Random;
import java.util.stream.Collectors;

class WordCluePair {
	String word;
	String clue;

	WordCluePair(String word, String clue) {
		this.word = word;
		this.clue = clue;
	}
}

/**
 * The Generator class constructs a crossword puzzle by placing words into a grid
 * based on intersection rules. It supports optional reversed word placement
 * and can be created using word banks from specific categories and lengths.
 * 
 * @author Armaan Saini
 */
public class Generator {
	private char[][] crossword;
	private final int width;
	private final int height;
	private ArrayList<String> words;
	private ArrayList<String> clues;
	private Random random;
	private ArrayList<String> reverseBlacklist;
	private boolean allowReverseWords;
    private ArrayList<DirectionalWord> wordLocations;
    private HashMap<String, String> reversedWordsMap;
    private boolean debug;
    String first;
    
    /**
     * Constructs a crossword generator with a specific configuration.
     *
     * @author Armaan Saini
     * @param debug Whether to print debug output
     * @param w Grid width
     * @param h Grid height
     * @param seed Random seed for consistent generation
     * @param words List of terms to use in crossword
     * @param clues Corresponding clues for each word
     * @param allowReverseWords Whether reversed words are allowed
     */
	public Generator(boolean debug, int w, int h, int seed, ArrayList<String> words, ArrayList<String> clues, boolean allowReverseWords) {
		this.crossword = new char[h][w];
		this.words = words;
		this.clues = clues;
		
		this.random = new Random(seed);
		this.allowReverseWords = allowReverseWords;
		this.reverseBlacklist = new ArrayList<String>();
		this.wordLocations = new ArrayList<DirectionalWord>();
		this.reversedWordsMap = new HashMap<String, String>();
		this.debug = debug;
		
		this.width = w;
		this.height = h;
		
		for (int y = 0; y < h; y++) {
			for (int x = 0; x < w; x++) {
				crossword[y][x] = '-';
			}
		}
		
		generate();
	}
	
    /**
     * Returns the final crossword grid.
     * @author Armaan Saini
     * @return 2D character array representing the crossword
     */
	public char[][] getCrossword() {
		return crossword;
	}
	
    /**
     * Returns the list of all placed words with their positions and directions.
     * @author Armaan Saini
     * @return List of placed DirectionalWords
     */
	public ArrayList<DirectionalWord> getWordLocations() {
		return wordLocations;
	}
	
	/**
	 * Checks if a word fits horizontally at the given location.
     * @author Armaan Saini
	 */
	private boolean checkFitsInRow(int x1, int y1, int length) {		
		if (x1 + length > width || y1 >= height) {
			return false;
		}
		
		return true;
	}
	
	/**
	 * Checks if a word fits vertically at the given location.
     * @author Armaan Saini
	 */
	private boolean checkFitsInColumn(int x1, int y1, int length) {
		if (x1 >= width || y1 + length > height) {
			return false;
		}
		
		return true;
	}
	
	/**
	 * Prints a debug message if debug mode is enabled.
     * @author Armaan Saini
	 */
	private void debugPrint(Object message) {
		if (debug) {
			System.out.println("[DBG] " + message.toString());
		}
	}
	
	/**
	 * Prints the current state of the crossword grid.
     * @author Armaan Saini
	 */
	private void print() {
		for (char[] row : crossword) {
			for (char x : row) {
				System.out.print(x + " ");
			}
			System.out.println();
		}
	}
	
	/**
	 * Places a word at the specified location and orientation.
     * @author Armaan Saini
	 */
	private void placeWord(String w, String clue, int x1, int y1, boolean horizontal) throws IllegalArgumentException {
		if (horizontal) {
//			if (!checkFitsInRow(x1, y1, w)) {
//				throw new IllegalArgumentException("Not within bounds");
//			}
			
			int length = w.length();
			
			for (int x2 = x1; x2 < x1 + length; x2++) {
				crossword[y1][x2] = w.charAt(x2 - x1);
			}
		} else {
//			if (!checkFitsInColumn(x1, y1, w)) {
//				throw new IllegalArgumentException("Not within bounds");
//			}
			
			int length = w.length();
			
			for (int y2 = y1; y2 < y1 + length; y2++) {
				crossword[y2][x1] = w.charAt(y2 - y1);
			}
		}
		
		String actualWord = reversedWordsMap.get(w);
		boolean isReversed = true;
		if (actualWord == null) {
			actualWord = w;
			isReversed = false;
		}
		
		wordLocations.add(new DirectionalWord(actualWord, horizontal, isReversed, clue, x1, y1));
	}
	

	/**
	 * Finds all coordinates in the grid where the current word intersects an
	 * already-placed letter.
     * @author Armaan Saini
	 */
	private ArrayList<Intersection> findAllIntersections(String word) {
		ArrayList<Intersection> result = new ArrayList<Intersection>();
		debugPrint("Current word: " + word);
		for (int charIndex = 0; charIndex < word.length(); charIndex++) {
			char c = word.charAt(charIndex);
			for (int x = 0; x < width; x++) {
				for (int y = 0; y < height; y++) {
					if (crossword[y][x] == c) {
//						System.out.println("Found intersection at " + x + ", " + y + " for char " + c);
						result.add(new Intersection(x, y, charIndex));
					}
				}
			}
		}
		
		return result;
	}
	
	/**
	 * Returns whether a given grid cell is occupied.
     * @author Armaan Saini
	 */
	private boolean isOccupied(int x, int y) {
		return crossword[y][x] != '-';
	}
	
	/**
	 * Counts occupied cells in a row segment.
     * @author Armaan Saini
	 */
	private int getPartialRowOccupations(int y, int x1, int x2) {
		if (x1 < 0) return -1;
		if (x2 >= crossword[0].length) return -1;
		if (y < 0 || y >= crossword.length) return -1;
		
		int count = 0;
		
		for (int i = x1; i <= x2; i++) {
			if (isOccupied(i, y)) {
				count++;
			}
		}
		
		return count;
	}
	
	/**
	 * Counts occupied cells in a column segment.
     * @author Armaan Saini
	 */
	private int getPartialColumnOccupations(int x, int y1, int y2) {
		if (y1 < 0) return -1;
		if (y2 >= crossword.length) return -1;
		if (x < 0 || x >= crossword[0].length) return -1;
		
		int count = 0;
		
		for (int i = y1; i <= y2; i++) {
			if (isOccupied(x, i)) {
				count++;
			}
		}

		return count;
	}
	
	/**
	 * Attempts to place a word in a row if it intersects at a valid location.
     * @author Armaan Saini
	 */
	private boolean checkRow(String w, String clue, Intersection loc) {
		if (getPartialRowOccupations(loc.getY(), loc.getX() - loc.getCharIndex(), loc.getX() - loc.getCharIndex() + w.length() - 1) == 1
				&& checkFitsInRow(loc.getX(), loc.getY(), w.length())) {
			placeWord(w, clue, loc.getX() - loc.getCharIndex(), loc.getY(), true);
			return true;
		}
		return false;
	}
	
	/**
	 * Attempts to place a word in a column if it intersects at a valid location.
     * @author Armaan Saini
	 */
	private boolean checkColumn(String w, String clue, Intersection loc) {
		if (getPartialColumnOccupations(loc.getX(), loc.getY() - loc.getCharIndex(), loc.getY() - loc.getCharIndex() + w.length() - 1) == 1
				&& checkFitsInColumn(loc.getX(), loc.getY(), w.length())) {
			placeWord(w, clue, loc.getX(), loc.getY() - loc.getCharIndex(), false);
			return true;
		}
		return false;
	}

	/**
	 * Places words into the grid with intersection logic.
     * @author Armaan Saini
	 */
	private void generate() {
		debugPrint(words);

		// Combine words and clues into a list of pairs
		ArrayList<WordCluePair> wordCluePairs = new ArrayList<>();
		for (int i = 0; i < words.size(); i++) {
			wordCluePairs.add(new WordCluePair(words.get(i), clues.get(i)));
		}

		// Shuffle the pairs
		Collections.shuffle(wordCluePairs, random);
		debugPrint("Shuffled: " + wordCluePairs.stream().map(p -> p.word).collect(Collectors.toList()));

		// Sort pairs by word length descending
		wordCluePairs.sort((a, b) -> b.word.length() - a.word.length());
		debugPrint("Sorted: " + wordCluePairs.stream().map(p -> p.word).collect(Collectors.toList()));

		// Unpack back to words and clues
		words = new ArrayList<>();
		clues = new ArrayList<>();
		for (WordCluePair pair : wordCluePairs) {
			words.add(pair.word);
			clues.add(pair.clue);
		}

		first = words.remove(0);
		String firstClue = clues.remove(0);
		boolean firstHorizontal = first.length() <= width;
		placeWord(first, firstClue, 0, 0, firstHorizontal);

		// Track how many words placed in each direction so far
		int horizontalCount = firstHorizontal ? 1 : 0;
		int verticalCount   = firstHorizontal ? 0 : 1;

		while (!words.isEmpty()) {
			String w = words.remove(0);
			String clue = clues.remove(0);
			ArrayList<Intersection> locations = findAllIntersections(w);
			boolean placementFound = false;

			while (!locations.isEmpty()) {
				Intersection loc = locations.remove(0);

				// Pick which direction to try first for this intersection.
				// Uses the seeded random so results are reproducible.
				boolean tryHorizontalFirst;
				boolean forceDirection = false;

				int gap = horizontalCount - verticalCount;

				if (horizontalCount == 0) {
					// No horizontal words yet — force horizontal, no fallback
					tryHorizontalFirst = true;
					forceDirection = true;
				} else if (verticalCount == 0) {
					// No vertical words yet — force vertical, no fallback
					tryHorizontalFirst = false;
					forceDirection = true;
				} else if (gap <= -3) {
					// 3+ more verticals than horizontals — force horizontal, no fallback
					tryHorizontalFirst = true;
					forceDirection = true;
				} else if (gap >= 3) {
					// 3+ more horizontals than verticals — force vertical, no fallback
					tryHorizontalFirst = false;
					forceDirection = true;
				} else if (horizontalCount < 2) {
					// Only 1 horizontal — always try horizontal first, but allow fallback
					tryHorizontalFirst = true;
				} else if (verticalCount < 2) {
					// Only 1 vertical — always try vertical first, but allow fallback
					tryHorizontalFirst = false;
				} else if (horizontalCount <= verticalCount) {
					// Fewer horizontals — 2-in-3 chance to try horizontal first
					tryHorizontalFirst = random.nextInt(3) < 2;
				} else {
					// Fewer verticals — 1-in-3 chance horizontal (i.e. 2-in-3 vertical)
					tryHorizontalFirst = random.nextInt(3) < 1;
				}

				// When forced, only try the required direction (skip fallback).
				// Otherwise try preferred direction first, fall back to the other.
				if (tryHorizontalFirst) {
					if (checkRow(w, clue, loc)) {
						horizontalCount++;
						placementFound = true;
					} else if (!forceDirection && checkColumn(w, clue, loc)) {
						verticalCount++;
						placementFound = true;
					}
				} else {
					if (checkColumn(w, clue, loc)) {
						verticalCount++;
						placementFound = true;
					} else if (!forceDirection && checkRow(w, clue, loc)) {
						horizontalCount++;
						placementFound = true;
					}
				}

				if (placementFound) break;
			}

			if (allowReverseWords && !placementFound && !reverseBlacklist.contains(w)) {
				String reversed = new StringBuilder(w).reverse().toString();
				words.add(0, reversed);
				clues.add(0, clue);
				reverseBlacklist.add(reversed);
				reversedWordsMap.put(reversed, w);
			}
		}

		debugPrint("Final: ");
		print();
	}

}