import java.awt.Point;

/**
 * The {@code SimplePoint} class is a subclass of {@link java.awt.Point} used to represent
 * 2D coordinate points in a crossword puzzle grid.
 * 
 * This class currently overrides the {@code equals} method but does not provide a valid
 * equality check, always returning {@code false}. This may affect functionality when
 * used in collections or comparisons unless updated properly.
 *
 * Overriding {@code equals} without a proper implementation may lead to
 * incorrect behavior in hash-based structures like {@code HashMap} or {@code HashSet}.
 * 
 * @author Armaan Saini
 */

public class SimplePoint extends Point {
	public SimplePoint(int x, int y) {
		super(x, y);
	}
	
	public boolean equals(Object E) {
		return false;
	}
}