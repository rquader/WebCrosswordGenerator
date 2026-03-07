import javax.swing.*;
import java.awt.*;
import java.awt.event.*;

public class Main {

    public static void main(String[] args){
        JFrame frame = new JFrame("Crossword");
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(300, 300);
        frame.setLayout(new GridLayout(4, 1));

        // letter size slider
        JPanel letterSizePanel = new JPanel();
        JLabel letterSizeLabel = new JLabel("Letter Size:");
        JSlider letterSizeSlider = new JSlider(10, 48, 24);
        letterSizeSlider.setMajorTickSpacing(8);
        letterSizeSlider.setPaintTicks(true);
        letterSizeSlider.setPaintLabels(true);
        letterSizePanel.add(letterSizeLabel);
        letterSizePanel.add(letterSizeSlider);
        frame.add(letterSizePanel);

        frame.setVisible(true);
    }
    
}
