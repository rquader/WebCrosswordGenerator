/**
 * Represents an intersection point on the crossword grid where a character
 * in a word matches an existing character already placed in the puzzle.
 * 
 * Stores the coordinates of the match (x, y) and the index of the character
 * in the new word that matched.
 * 
 * Used by the crossword generator to align new words based on shared characters.
 * 
 * @author Armaan Saini
 */
public class Intersection {
	private int x;
	private int y;
	private int charIndex;
	
	/**
     * Constructs an Intersection with specified coordinates and character index.
     * 
     * @author Armaan Saini
     * @param x - the x coordinate (column) on the grid
     * @param y - the y coordinate (row) on the grid
     * @param charIndex - the index of the character in the word that intersects
     */
	public Intersection(int x, int y, int charIndex) {
		this.setX(x);
		this.setY(y);
		this.setCharIndex(charIndex);
	}

	/**
     * Returns the x-coordinate of the intersection.
     * @author Armaan Saini
     * @return the x (column) value
     */
	public int getX() {
		return x;
	}

	/**
     * Sets the x-coordinate of the intersection.
     * @author Armaan Saini
     * @param x the new x (column) value
     */
	public void setX(int x) {
		this.x = x;
	}

	/**
     * Returns the y-coordinate of the intersection.
     * @author Armaan Saini
     * @return the y (row) value
     */
	public int getY() {
		return y;
	}
	
	/**
     * Sets the y-coordinate of the intersection.
     * @author Armaan Saini
     * @param y the new y (row) value
     */
	public void setY(int y) {
		this.y = y;
	}

	/**
     * Returns the character index in the word that caused the intersection.
     * @author Armaan Saini
     * @return the index of the intersecting character
     */
	public int getCharIndex() {
		return charIndex;
	}

	/**
     * Sets the character index in the word that intersects at this point.
     * @author Armaan Saini
     * @param charIndex the index of the intersecting character in the word
     */
	public void setCharIndex(int charIndex) {
		this.charIndex = charIndex;
	}
	
	/**
     * Returns a human-readable string representation of the intersection details.
     * @author Armaan Saini
     * @return string describing the coordinates and character index
     */
    @Override
	public String toString() {
		return "Intersection at (" + x + ", " + y + ") with char index " + charIndex;
	}
}