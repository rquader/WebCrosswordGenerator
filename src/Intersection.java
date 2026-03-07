public class Intersection {
	private int x;
	private int y;
	private int charIndex;
	
	public Intersection(int x, int y, int charIndex) {
		this.setX(x);
		this.setY(y);
		this.setCharIndex(charIndex);
	}

	public int getX() {
		return x;
	}

	public void setX(int x) {
		this.x = x;
	}

	public int getY() {
		return y;
	}

	public void setY(int y) {
		this.y = y;
	}

	public int getCharIndex() {
		return charIndex;
	}

	public void setCharIndex(int charIndex) {
		this.charIndex = charIndex;
	}
	
	public String toString() {
		return "Intersection at (" + x + ", " + y + ") with char index " + charIndex;
	}
}
