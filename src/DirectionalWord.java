/**
 * Represents a word placed in a crossword grid along with its direction,
 * orientation (reversed or not), and its associated clue.
 * @author Armaan Saini
 */
public class DirectionalWord {
    private String word;
    private boolean isHorizontal;
    private boolean isReversed;
    private String clue;

    /**
     * Constructs a new DirectionalWord.
     *
     * @author Armaan Saini
     * @param word The word to be placed in the crossword.
     * @param isHorizontal True if the word is placed horizontally, false if vertically.
     * @param isReversed True if the word is placed in reverse order.
     * @param clue The clue associated with the word.
     */
    public DirectionalWord(String word, boolean isHorizontal, boolean isReversed, String clue) {
        this.setWord(word);
        this.setHorizontal(isHorizontal);
        this.setReversed(isReversed);
        this.setClue(clue);
    }

    /**
     * Gets the word value.
     * 
     * @author Armaan Saini
     * @return The word string.
     */
    public String getWord() {
        return word;
    }

    /**
     * Sets the word value.
     * 
     * @author Armaan Saini
     * @param word The word string.
     */
    public void setWord(String word) {
        this.word = word;
    }

    /**
     * Gets the clue for the word.
     * 
     * @author Armaan Saini
     * @return The clue string.
     */
    public String getClue() {
        return clue;
    }

    /**
     * Sets the clue for the word.
     * 
     * @author Armaan Saini
     * @param clue The clue string.
     */
    public void setClue(String clue) {
        this.clue = clue;
    }

    /**
     * Checks whether the word is placed horizontally.
     * 
     * @author Armaan Saini
     * @return True if horizontal, false if vertical.
     */
    public boolean isHorizontal() {
        return isHorizontal;
    }

    /**
     * Sets the word orientation (horizontal or vertical).
     * 
     * @author Armaan Saini
     * @param isHorizontal True if horizontal, false if vertical.
     */
    public void setHorizontal(boolean isHorizontal) {
        this.isHorizontal = isHorizontal;
    }

    /**
     * Checks whether the word is reversed.
     * 
     * @author Armaan Saini
     * @return True if reversed, false otherwise.
     */
    public boolean isReversed() {
        return isReversed;
    }

    /**
     * Sets the reversed status of the word.
     * 
     * @author Armaan Saini
     * @param isReversed True if the word is reversed.
     */
    public void setReversed(boolean isReversed) {
        this.isReversed = isReversed;
    }

    /**
     * Returns a string representation of the word, including its orientation.
     * 
     * @author Armaan Saini
     * @return A string indicating the word and whether it is horizontal.
     */
    public String toString() {
        return word + " [Horizontal: " + isHorizontal + "]";
    }
}