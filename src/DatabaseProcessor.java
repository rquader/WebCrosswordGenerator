import java.util.ArrayList;
import java.util.Collections;

public class DatabaseProcessor {

    /**
     * Returns an ArrayList of terms (solutions) from a unit's 2D array where each term has the specified length.
     * 
     * @param unit A 2D array of [term, clue] pairs
     * @param length Desired word length
     * @return List of matching terms
     */
    public ArrayList<String> getTermsByLength(String[][] unit, int length) {
        ArrayList<String> result = new ArrayList<String>();
        for (int i = 0; i < unit.length; i++) {
            if (unit[i][0].length() <= length) {
                result.add(unit[i][0]);
            }
        }
        return result;
    }

    /**
     * Returns an ArrayList of terms (solutions) from a unit's 2D array where each term has the specified length.
     * 
     * @param unit A 2D array of [term, clue] pairs
     * @param length Desired word length
     * @return List of matching terms
     */
    public ArrayList<String> getCluesByLength(String[][] unit, int length) {
        ArrayList<String> result = new ArrayList<String>();
        for (int i = 0; i < unit.length; i++) {
            if (unit[i][0].length() <= length) {
                result.add(unit[i][1]);
            }
        }
        return result;
    }

    /**
     * Returns a list of clues corresponding to a provided list of terms, maintaining order.
     *
     * @param unit A 2D array of [term, clue] pairs
     * @param terms List of terms (e.g., those placed in crossword)
     * @return List of clues in same order as terms
     */
    public ArrayList<String> getCluesByTerms(String[][] unit, ArrayList<String> terms) {
        ArrayList<String> clues = new ArrayList<>();
        for (int i = 0; i < terms.size(); i++) {
            String term = terms.get(i);
            for (int j = 0; j < unit.length; j++) {
                if (unit[j][0].equals(term)) {
                    clues.add(unit[j][1]);
                    break;
                }
            }
        }
        return clues;
    }

    /**
     * Optional: Shuffle a word list.
     */
    public void shuffleList(ArrayList<String> list) {
        Collections.shuffle(list);
    }

}
