import javax.swing.*;
import javax.swing.border.LineBorder;
import javax.swing.event.ChangeListener;
import java.awt.*;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * The CrosswordUI class creates a graphical user interface for generating crossword puzzles.
 * 
 * This class includes:
 * - Sliders to adjust grid width and height
 * - A dropdown menu to select a word category (e.g., CSA units, English)
 * - An optional seed input to generate consistent puzzles
 * - A dynamic display of the crossword grid
 * - Panels showing horizontal and vertical clues
 * 
 * Upon user interaction, the class communicates with a Generator class and a Database to build
 * and display the crossword puzzle with matching clues.
 * 
 * This class is the entry point of the application and handles layout, user controls,
 * and UI updates.
 * 
 * Authors: Rafan Quader, Anthony Phanh, Ethan Le, Kabir Khan, Armaan Saini
 */
public class CrosswordUI extends JFrame {



    private JSlider widthSlider;

    private JSlider heightSlider;

    private JLabel widthValueLabel;

    private JLabel heightValueLabel;

    private JPanel gridPanel; // Panel to hold the crossword grid

    private char[][] wordGrid;

    private ArrayList<String> horizontalWords;

    private ArrayList<String> verticalWords;

    private JPanel horizontalKey = new JPanel();

    private JPanel verticalKey = new JPanel();

    private JPanel Key = new JPanel(new GridLayout(1,2));
    
    private JTextField seedField = new JTextField("Enter seed here...");
    
    private String[] categories = {"Unit_1", "Unit_2", "Unit_3", "Unit_4", "Unit_5", "Unit_6", "Unit_7", "Unit_8", "English"};

    private final JComboBox<String> categoryPicker = new JComboBox<String>(categories);
    
    private int random = -1;
    
    private int seed = 0;

    /**
     * Constructor for the CrosswordUI.
     * Sets up all user interface components and layout.
     */
    public CrosswordUI() {

        setTitle("Crossword Generator");

        setDefaultCloseOperation(EXIT_ON_CLOSE);

        setLayout(new BorderLayout(10, 10));
        



        //Creates a window with sliders

        JPanel controlPanel = createControlPanel();

        add(controlPanel, BorderLayout.NORTH);
        
        
        JLabel categoryPickerLabel = new JLabel("Pick A Category: ");
        controlPanel.add(categoryPickerLabel);
        categoryPicker.setVisible(true);
        controlPanel.add(categoryPicker);
        
        JLabel seedLabel = new JLabel("Add a seed (optional): ");
        controlPanel.add(seedLabel);
        controlPanel.add(seedField);


        // Creates the crossword space

        gridPanel = new JPanel();

        gridPanel.setBorder(BorderFactory.createTitledBorder("Crossword Grid"));

        add(gridPanel, BorderLayout.CENTER);

       

       Key.add(horizontalKey);

       Key.add(verticalKey);

       add(Key, BorderLayout.SOUTH);

        

        pack();

        setLocationRelativeTo(null); 

        setVisible(true);

    }


    /**
     * Builds and returns the top control panel containing sliders and the generate button.
     * @author Anthony Phanh
     * @return the constructed JPanel
     */
    private JPanel createControlPanel() {

        JPanel controlPanel = new JPanel();

        controlPanel.setLayout(new GridBagLayout());

        GridBagConstraints gbc = new GridBagConstraints();



        // Width slider setup (Minimum 2 to Maximum 10)

        JLabel widthLabel = new JLabel("Width:");

        widthSlider = new JSlider(JSlider.HORIZONTAL, 2, 10, 5);

        widthSlider.setMajorTickSpacing(1);

        widthSlider.setPaintTicks(true);

        widthSlider.setPaintLabels(true);

        widthValueLabel = new JLabel("5");

        ChangeListener widthListener = e ->

            widthValueLabel.setText(String.valueOf(widthSlider.getValue()));

        widthSlider.addChangeListener(widthListener);



        // Height slider setup (Minimum 2 to Maximum 10)

        JLabel heightLabel = new JLabel("Height:");

        heightSlider = new JSlider(JSlider.HORIZONTAL, 2, 10, 5);

        heightSlider.setMajorTickSpacing(1);

        heightSlider.setPaintTicks(true);

        heightSlider.setPaintLabels(true);

        heightSlider.setSnapToTicks(true);

        heightValueLabel = new JLabel("5");

        ChangeListener heightListener = e ->

            heightValueLabel.setText(String.valueOf(heightSlider.getValue()));

        heightSlider.addChangeListener(heightListener);



        // Generates a button to create crossword grid

        JButton generateButton = new JButton("Generate Crossword");

        generateButton.addActionListener(e -> generateCrosswordGrid());



        // Layout

        gbc.insets = new Insets(5, 5, 5, 5);

        gbc.gridx = 0;

        gbc.gridy = 0;

        controlPanel.add(widthLabel, gbc);



        gbc.gridx = 1;

        controlPanel.add(widthSlider, gbc);



        gbc.gridx = 2;

        controlPanel.add(widthValueLabel, gbc);



        gbc.gridx = 0;

        gbc.gridy = 1;

        controlPanel.add(heightLabel, gbc);



        gbc.gridx = 1;

        controlPanel.add(heightSlider, gbc);



        gbc.gridx = 2;

        controlPanel.add(heightValueLabel, gbc);



        gbc.gridx = 1;

        gbc.gridy = 2;

        gbc.gridwidth = 2;

        controlPanel.add(generateButton, gbc);



        return controlPanel;

    }

    
    /**
     * Creates and updates the clue panels for horizontal and vertical clues.
     * Populates JTextFields for each clue in the crossword.
     * @author Rafan Quader
     */
    public void createKey() {
    	
 
    	horizontalKey.removeAll();
    	verticalKey.removeAll();
    	horizontalKey.add(new JTextField("Horizontal"));
        verticalKey.add(new JTextField("Vertical"));

    	horizontalKey.setLayout(new GridLayout(horizontalWords.size() + 1, 1));

    	for (String hClue : horizontalWords) {

     	   JTextField hClueText = new JTextField();

     	   hClueText.setText(hClue);

     	   horizontalKey.add(hClueText);

        }

    	verticalKey.setLayout(new GridLayout(verticalWords.size() + 1, 1));

    	for (String vClue : verticalWords) {

    		JTextField vClueText = new JTextField();

    		vClueText.setText(vClue);

     	   verticalKey.add(vClueText);

        }

    }


    /**
     * Generates and displays the crossword grid on the panel.
     * Also refreshes the clues using createKey() method.
     * @author Anthony Phanh, Rafan Quader
     */
    private void generateCrosswordGrid() {

        int width = widthSlider.getValue();

        int height = heightSlider.getValue();



        // Will clear previous grids when you refresh

        gridPanel.removeAll();

        gridPanel.setLayout(new GridLayout(height, width, 2, 2));

        generateCrossword(width,height);

        for (int row = 0; row < height; row++) {

            for (int col = 0; col < width; col++) {

                JTextField cell = new JTextField();

                cell.setText( String.valueOf(wordGrid[row][col]) );

                cell.setHorizontalAlignment(JTextField.CENTER);

                cell.setPreferredSize(new Dimension(30, 30));

                cell.setBorder(new LineBorder(Color.BLACK));

                gridPanel.add(cell);

            }

        }

        createKey();

        // Refresh

        horizontalKey.repaint();

        verticalKey.repaint();

        Key.repaint();

        gridPanel.revalidate();

        gridPanel.repaint();

        pack();

    }

    
    /**
     * Uses selected category and word length to generate a crossword puzzle.
     * Pulls filtered words and clues from the Database class, applies random or fixed seed, and builds the grid.
     * @author Rafan Quader
     * @param w the desired grid width
     * @param h the desired grid height
     */
    public void generateCrossword(int w, int h) {

    	wordGrid = new char[w][h];
    	
    	Database db = new Database();
    	DatabaseProcessor dp = new DatabaseProcessor();
    	// Choose a unit (you can later tie this to a dropdown menu)
    	String selectedItem = (String)categoryPicker.getSelectedItem();
    	String[][] selectedUnit = db.getUnitByName(selectedItem); // Or getEnglish(), getUsHistory(), etc.
    	
    	System.out.println(selectedUnit);
    	
    	// Get only words that fit width
    	int maxDim = Math.max(w, h);
    	ArrayList<String> wordList = dp.getTermsByLength(selectedUnit, maxDim);

    	ArrayList<String> clueList = dp.getCluesByLength(selectedUnit, maxDim);

    	// Seed to Generator
        try {
    		seed = Integer.parseInt(seedField.getText());
    		if (seed == random) {
    			seed = (int) (Math.random() * 1000);
        		seedField.setText("" + seed);
        		random = seed;
    		}
    	} catch(Exception e) {
    		seed = (int) (Math.random() * 1000);
    		seedField.setText("" + seed);
    		random = seed;
    	}
        System.out.println(wordList);
        System.out.println(clueList);
        
        Generator g = new Generator(true, w, h, seed, wordList, clueList, true);
    	
    	wordGrid = g.getCrossword();

    	horizontalWords = new ArrayList<String>();

    	verticalWords = new ArrayList<String>();

    	ArrayList<DirectionalWord> wordIndex = g.getWordLocations();

    	System.out.println(wordIndex);
    	for (DirectionalWord word : wordIndex) {
    		String reversed = "";

    		if (word.isReversed()) {
    			reversed = "r-";
    		}

    		String position = "(" + word.getX() + "," + word.getY() + ")";
    		if (word.isHorizontal()) {
    			System.out.println("horizontal!" + word.getWord());
    			horizontalWords.add(reversed + word.getWord() + " at " + position + " Clue: " + word.getClue());
    		} else {
    			verticalWords.add(reversed + word.getWord() + " at " + position + " Clue: " + word.getClue());
    		}
    	}

    }


    /**
     * Launches the crossword generator UI
     * @author Anthony Phanh
     * @param args
     */
    public static void main(String[] args) {

        SwingUtilities.invokeLater(CrosswordUI::new);

    }

}
