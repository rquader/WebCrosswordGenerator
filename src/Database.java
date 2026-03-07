import java.util.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Random;



public class Database {
    private String[][] unit_1;
    private String[][] unit_2;
    private String[][] unit_3;
    private String[][] unit_4;
    private String[][] unit_5;
    private String[][] unit_6;
    private String[][] unit_7;
    private String[][] unit_8;
    private String[][] usHistory;
    private String[][] english;


    public Database() {
    	unit_1 = new String[][] {
    	    {"id", "Short for identifier, a name given to a variable or method"},
    	    {"os", "Abbreviation for Operating System"},
    	    {"if", "A conditional statement keyword"},
    	    {"do", "Part of a loop construct, do-while"},
    	    {"pi", "Mathematical constant, approximately 3.14159"},
    	    {"int", "A Java keyword for a whole number type"},
    	    {"new", "Keyword used to create an object"},
    	    {"run", "To execute a program"},
    	    {"ide", "Integrated Development Environment, software for building applications"},
    	    {"api", "Application Programming Interface, a set of rules for building software"},
    	    {"ram", "Random Access Memory, computer's short-term data storage"},
    	    {"bit", "Smallest unit of data in a computer"},
    	    {"bug", "An error or flaw in a computer program"},
    	    {"get", "Common prefix for accessor methods"},
    	    {"set", "Common prefix for mutator methods"},
    	    {"try", "Keyword for exception handling block"},
    	    {"for", "A common loop structure keyword"},
    	    {"cpu", "Central Processing Unit, the brain of the computer"},
    	    {"java", "The programming language introduced in this course"},
    	    {"byte", "Smallest integer primitive type in Java"},
    	    {"char", "A single 16-bit Unicode character type"},
    	    {"true", "One of the two boolean values"},
    	    {"void", "Keyword indicating a method returns no value"},
    	    {"null", "A special literal representing no object"},
    	    {"else", "Part of an if-else conditional statement"},
    	    {"long", "A 64-bit integer data type"},
    	    {"this", "Keyword referring to the current instance of a class"},
    	    {"case", "Used within a switch statement"},
    	    {"math", "A class providing basic numeric operations"},
    	    {"code", "Instructions written in a programming language"},
    	    {"data", "Information processed or stored by a computer"},
    	    {"loop", "A control structure that repeats a block of code"},
    	    {"cast", "Explicitly converts data from one type to another"},
    	    {"args", "Common name for command-line arguments array in main method"},
    	    {"file", "A collection of data stored under a single name"},
    	    {"float", "A 32-bit decimal type with less precision than double"},
    	    {"false", "Opposite of true in boolean logic"},
    	    {"class", "Blueprint for creating Java objects"},
    	    {"main", "The entry point method for a Java program"},
    	    {"print", "Outputs text without a newline"},
    	    {"debug", "Process of finding and fixing errors"},
    	    {"error", "A problem that prevents code from running"},
    	    {"input", "Data provided to the program by the user"},
    	    {"scope", "Region of code where a variable is accessible"},
    	    {"while", "A loop structure that repeats as long as a condition is true"},
    	    {"break", "Keyword to exit a loop or switch statement"},
    	    {"final", "Keyword used to declare a constant or prevent inheritance/overriding"},
    	    {"index", "Position of an element in an array or string"},
    	    {"value", "The piece of data stored in a variable"},
    	    {"array", "A data structure that stores a fixed-size sequential collection of elements of the same type"},
    	    {"logic", "The principles of reasoning, often used in conditional statements"},
    	    {"throw", "Keyword used to signal an exception"},
    	    {"double", "A primitive type that stores decimal numbers"},
    	    {"method", "A block of code that performs a task"},
    	    {"system", "A class used to access system resources in Java"},
    	    {"return", "Keyword to send a value back from a method"},
    	    {"static", "Keyword indicating a member belongs to the class, not instances"},
    	    {"public", "Access modifier allowing access from any class"},
    	    {"import", "Keyword to bring external classes or packages into use"},
    	    {"object", "An instance of a class"},
    	    {"string", "A sequence of characters, a common class in Java"},
    	    {"output", "Information displayed to the user"},
    	    {"binary", "Number system with base 2, used by computers"},
    	    {"editor", "Software used to write and modify code"},
    	    {"prompt", "A message displayed to the user requesting input"},
    	    {"equals", "Method to compare the content of two objects"},
    	    {"switch", "A control flow statement that selects one of many code blocks to be executed"},
    	    {"boolean", "A type that holds true or false values"},
    	    {"println", "Outputs text with a newline"},
    	    {"compile", "Convert code into bytecode before execution"},
    	    {"keyword", "Reserved word with a special meaning in Java"},
    	    {"braces", "Used to define a block of code { }"},
    	    {"literal", "A fixed value written directly in code"},
    	    {"scanner", "Class used to get input from the user"},
    	    {"console", "Text-based interface for I/O operations"},
    	    {"integer", "A whole number, often represented by the 'int' type"},
    	    {"package", "A namespace that organizes a set of related classes and interfaces"},
    	    {"private", "Access modifier restricting access to the same class"},
    	    {"execute", "To run or carry out the instructions of a program"},
    	    {"comment", "Non-executed text used to describe code (singular form)"},
    	    {"declare", "Create a variable without assigning a value"},
    	    {"convert", "To change data from one type or format to another"},
    	    {"variable", "A container for storing data values"},
    	    {"bytecode", "Intermediate code executed by JVM"},
    	    {"semicolon", "Ends a Java statement ;"},
    	    {"comments", "Non-executed text used to describe code (plural form)"},
    	    {"overflow", "Occurs when a value exceeds storage limits"},
    	    {"constant", "A variable declared with 'final' and unchangeable"},
    	    {"operator", "Symbol that performs operations on variables and values"},
    	    {"instance", "An object created from a class"},
    	    {"compiler", "A program that translates source code into machine code or bytecode"},
    	    {"argument", "A value passed to a method when it is called"},
    	    {"abstract", "Keyword for classes that cannot be instantiated, and for methods without implementation"},
    	    {"modifier", "Keywords like public, private, static that define properties of classes, methods, or variables"},
    	    {"concaten", "To join strings together"},
    	    {"variable", "A named storage location in memory"},
    	    {"datatype", "Another term for a variable's type"},
    	    {"primitive", "Basic data types predefined by Java (e.g., int, double, boolean)"},
    	    {"statement", "A complete instruction in Java"},
    	    {"parameter", "A variable in a method definition"},
    	    {"algorithm", "A step-by-step procedure for solving a problem"},
    	    {"exception", "An event that disrupts the normal flow of program execution"},
    	    {"subclass", "A class that inherits from another class (superclass)"},
    	    {"increment", "To increase the value of a variable, usually by one"},
    	    {"decrement", "To decrease the value of a variable, usually by one"},
    	    {"recursion", "A technique where a method calls itself"},
    	    {"remainder", "The value left over after division, obtained with the modulus operator"},
    	    {"identifier", "Name used for variables, classes, and methods"},
    	    {"initialize", "Assigning a value to a variable for the first time"},
    	    {"assignment", "The operation of storing a value in a variable using '='"},
    	    {"expression", "Code that produces a value"},
    	    {"arithmetic", "Type of operator used for math operations (+, -, *, /)"},
    	    {"precedence", "Determines order of operator evaluation"},
    	    {"superclass", "A class from which other classes inherit (parent class)"},
    	    {"encapsulate", "Bundling data and methods that operate on the data within a single unit (class)"},
    	    {"whitespace", "Characters like space, tab, or newline, used for formatting"},
    	    {"constructor", "A special method used to initialize objects"}
    	};



    	unit_2 = new String[][] {
    	    // 2-Letter Words
    	    {"is", "A common prefix for boolean accessor methods (e.g., isEmpty)"},
    	    {"pi", "Mathematical constant available in the Math class (Math.PI)"},
    	    {"id", "An identifier, often used for instance variables"},
    	    {"no", "Can refer to 'no-argument' as in a no-arg constructor"},

    	    // 3-Letter Words
    	    {"new", "Keyword used to instantiate an object from a class"},
    	    {"dot", "Operator (.) used to access members (fields or methods) of an object"},
    	    {"get", "Common prefix for accessor (getter) methods"},
    	    {"set", "Common prefix for mutator (setter) methods"},
    	    {"api", "Application Programming Interface, defines how objects interact"},
    	    {"abs", "Method in Math class for absolute value (Math.abs)"},
    	    {"pow", "Method in Math class for exponentiation (Math.pow)"},
    	    {"arg", "Short for argument, a value passed to a method"},
    	    {"try", "Keyword used in exception handling, often with Scanner"},
    	    {"max", "Method in Math class to find the larger of two values (Math.max)"},
    	    {"min", "Method in Math class to find the smaller of two values (Math.min)"},

    	    // 4-Letter Words
    	    {"null", "A literal representing an uninitialized object reference"},
    	    {"math", "A utility class in Java providing static methods for numeric operations"},
    	    {"void", "Keyword indicating a method does not return any value"},
    	    {"this", "Keyword referring to the current object instance"},
    	    {"true", "A boolean literal value"},
    	    {"else", "Used with 'if' for conditional logic"},
    	    {"char", "Primitive data type, also used in String methods like charAt"},
    	    {"data", "Information stored in an object's fields"},
    	    {"type", "The classification of an object or variable (e.g., String, int)"},
    	    {"call", "The act of invoking a method"},
    	    {"sqrt", "Method in Math class for square root (Math.sqrt)"},
    	    {"copy", "Creating a new object with the same state as another"},
    	    {"heap", "The memory area where objects are allocated"},
    	    {"name", "Often used for identifiers or String representations"},
    	    {"byte", "Primitive data type, wrapper class is Byte"},

    	    // 5-Letter Words
    	    {"class", "The blueprint or template for creating objects"},
    	    {"state", "The collective values of an object's instance variables"},
    	    {"field", "An instance variable, a piece of data within an object"},
    	    {"super", "Keyword to refer to the parent class, often used in constructors or overriding"},
    	    {"index", "A numerical position, used in String or array access"},
    	    {"parse", "To convert a String to a numeric type (e.g., Integer.parseInt)"},
    	    {"round", "Method in Math class to round a float or double (Math.round)"},
    	    {"local", "A variable declared inside a method"},
    	    {"final", "Keyword to make a variable a constant or prevent method overriding/class inheritance"},
    	    {"throw", "Keyword to signal an exception explicitly"},
    	    {"short", "Primitive data type, wrapper class is Short"},
    	    {"nargs", "Abbreviation for 'number of arguments'"}, // Number of arguments

    	    // 6-Letter Words
    	    {"object", "An instance of a class, representing a specific entity"},
    	    {"method", "A named block of code associated with a class or object that performs a task"},
    	    {"random", "Class (java.util.Random) used to generate pseudo-random numbers"},
    	    {"string", "An object representing a sequence of characters"},
    	    {"length", "Method of String class to get its number of characters; also array property"},
    	    {"equals", "Method used to compare the content of two objects (especially Strings)"},
    	    {"charat", "String method (charAt) to get a character at a specific index"},
    	    {"return", "Keyword used to send a value back from a method to its caller"},
    	    {"import", "Statement to make classes from other packages available"},
    	    {"static", "Keyword indicating a member belongs to the class itself, not to instances"},
    	    {"public", "Access modifier allowing unrestricted access to a class member"},
    	    {"fields", "Plural of field, referring to an object's instance variables"},
    	    {"client", "Code that uses another class or object"},
    	    {"double", "Primitive data type; also a wrapper class (Double)"},
    	    {"params", "Short for parameters, variables in a method signature"},
    	    {"printf", "Method for formatted output (e.g., System.out.printf)"},
    	    {"hidden", "Refers to instance variables hidden by local variables or parameters of the same name"},

    	    // 7-Letter Words
    	    {"scanner", "Class (java.util.Scanner) for reading user input"},
    	    {"indexof", "String method (indexOf) to find the first occurrence of a substring"},
    	    {"mutator", "A method (setter) designed to modify an object's instance variable(s)"},
    	    {"private", "Access modifier restricting access to members within the same class"},
    	    {"default", "Access level if no modifier is specified (package-private)"},
    	    {"package", "A namespace that organizes a set of related classes and interfaces"},
    	    {"javadoc", "Tool that generates API documentation from comments in source code"},
    	    {"integer", "Wrapper class (Integer) for the int primitive type"},
    	    {"boolean", "Primitive data type; also a wrapper class (Boolean)"},
    	    {"compare", "Often part of method names like compareTo, for ordering objects"},
    	    {"wrapper", "A class that encapsulates a primitive data type (e.g., Integer for int)"},
    	    {"address", "Memory location where an object is stored, held by a reference variable"},
    	    {"casting", "Converting an object reference from one type to another compatible type"},
    	    {"compile", "The process of translating source code into bytecode"},
    	    {"extends", "Keyword used in class declarations to specify the superclass (for inheritance)"},

    	    // 8-Letter Words
    	    {"tostring", "Method (toString) that returns a String representation of an object"},
    	    {"overload", "Method overloading: defining multiple methods with the same name but different parameter lists"},
    	    {"argument", "A value passed to a method when it is invoked"},
    	    {"instance", "A concrete occurrence of any object, existing usually during the runtime of a computer program"},
    	    {"accessor", "A method (getter) designed to retrieve the value of an object's instance variable"},
    	    {"behavior", "The set of actions an object can perform, defined by its methods"},
    	    {"identity", "Distinguishes one object from another; reference equality (==) checks this"},
    	    {"implicit", "Not explicitly stated, e.g., implicit `this` reference"},
    	    {"explicit", "Clearly stated, e.g., explicit parameter passing"},
    	    {"variable", "A named storage location; instance variables define an object's state"},
    	    {"noargs", "Refers to a constructor that takes no arguments"}, // no-arguments
    	    {"abstract", "Keyword for classes that cannot be instantiated or methods that must be implemented by subclasses"},
    	    {"subclass", "A class that inherits from another class"},

    	    // 9-Letter Words
    	    {"reference", "A variable that stores the memory address of an object"},
    	    {"immutable", "An object whose state cannot be changed after creation (e.g., String)"},
    	    {"substring", "String method to get a part of the string"},
    	    {"parameter", "A variable in a method definition that receives a value when the method is called"},
    	    {"classcast", "Short for ClassCastException, an error when improperly casting objects"},
    	    {"interface", "A reference type that defines a contract of methods a class can implement"},
    	    {"aliasing", "When two or more reference variables point to the same object"},
    	    {"signature", "A method's name along with the types and order of its parameters"},
    	    {"autoboxing", "Automatic conversion between a primitive type and its corresponding wrapper class object"},
    	    {"primitive", "Basic data types like int, double, boolean, not objects"},
    	    {"blueprint", "A class serves as a blueprint for objects"},
    	    {"formal", "Formal parameters are the parameters as they appear in the method definition"},

    	    // 10-Letter Words
    	    {"instanceof", "Operator to check if an object is an instance of a particular class or interface"},
    	    {"overriding", "Method overriding: providing a specific implementation for a method inherited from a superclass"},
    	    {"initialize", "To assign an initial value to a variable or an object's fields, often in a constructor"},
    	    {"parameters", "Plural of parameter; the variables listed in a method's signature"},
    	    {"visibility", "The accessibility of class members (e.g., public, private)"},
    	    {"mutability", "The ability of an object's state to be changed after creation"},
    	    {"unboxing", "Automatic conversion from a wrapper class object to its corresponding primitive type"},
    	    {"clientcode", "Code written by a user of a class (the client)"},
    	    {"deprecated", "A class or method marked as outdated and may be removed in future versions"},
    	    {"exceptions", "Events that occur during program execution that disrupt the normal flow of instructions"},
    	    {"superclass", "The parent class from which another class inherits"},
    	    {"actualargs", "Actual arguments (or just arguments) are the values passed into a method call"}, // Actual arguments

    	};

    	unit_3 = new String[][] {
    	    // 2-Letter Words
    	    {"if", "Keyword to start a conditional statement"},
    	    {"or", "Logical operator ||, true if at least one operand is true"},
    	    {"eq", "Abbreviation for 'equals', often used with == symbol"},
    	    {"ne", "Abbreviation for 'not equal', often used with != symbol"},
    	    {"gt", "Abbreviation for 'greater than', symbol >"},
    	    {"lt", "Abbreviation for 'less than', symbol <"},

    	    // 3-Letter Words
    	    {"and", "Logical operator &&, true if both operands are true"},
    	    {"not", "Logical operator !, inverts a boolean value"},
    	    {"xor", "Logical operator for exclusive OR (true if operands differ)"},
    	    {"end", "Marks the logical termination of a code block"},
    	    {"run", "To cause the program to execute statements"},
    	    {"key", "A reserved word in Java, like 'if' or 'else'"},
    	    {"bit", "A single binary digit, basis of boolean values"},

    	    // 4-Letter Words
    	    {"else", "Keyword for code executed if 'if' condition is false"},
    	    {"true", "A boolean literal representing a true condition"},
    	    {"less", "Relational operator <, for less than comparison"},
    	    {"then", "Implied keyword following an 'if' condition before its block"},
    	    {"code", "Statements executed within a conditional block"},
    	    {"flow", "Short for control flow, the order of execution"},
    	    {"path", "A specific sequence of executed statements"},
    	    {"skip", "What happens to a block if its condition is false"},
    	    {"test", "A condition in an 'if' statement acts as this"},
    	    {"flag", "A boolean variable used to signal a state or condition"},
    	    {"data", "Information, like a boolean value, processed by conditions"},

    	    // 5-Letter Words
    	    {"false", "A boolean literal representing an untrue condition"},
    	    {"equal", "Relational operator ==, tests for equality"},
    	    {"logic", "The system of reasoning used in boolean expressions"},
    	    {"block", "A group of statements enclosed in braces {}"},
    	    {"scope", "The region where a variable is accessible"},
    	    {"brace", "Symbol { or } used to define a code block"},
    	    {"truth", "The quality of being true, as in a truth table"},
    	    {"check", "To evaluate a condition or verify a state"},
    	    {"chain", "A sequence of if-else if-else statements"},
    	    {"guard", "An if statement preventing errors or unwanted execution"},
    	    {"value", "A boolean literal (true or false) is a ___"},
    	    {"valid", "A condition might check if input is ___"},

    	    // 6-Letter Words
    	    {"elseif", "Keyword for an 'else if' conditional check"},
    	    {"nested", "An if statement inside another if statement"},
    	    {"binary", "Having two states, like boolean true/false"},
    	    {"branch", "A point in control flow where execution can diverge"},
    	    {"clause", "An 'if' or 'else' part of a conditional statement"},
    	    {"result", "The boolean outcome of evaluating an expression"},
    	    {"negate", "To reverse a boolean value using the NOT operator"},
    	    {"either", "Used in logic like 'either A or B' (inclusive OR)"},
    	    {"syntax", "The grammatical rules for writing Java code"},
    	    {"op", "Common abbreviation for 'operator'"},
    	    {"assert", "A statement to check a condition, for debugging"},

    	    // 7-Letter Words
    	    {"boolean", "A primitive data type for true/false values"},
    	    {"greater", "Relational operator >, for greater than comparison"},
    	    {"compare", "To evaluate the relationship between two values"},
    	    {"logical", "Type of operator like &&, ||, !"},
    	    {"default", "The code path taken if no prior conditions are met"},
    	    {"outcome", "The result (true or false) of a conditional test"},
    	    {"execute", "To carry out the instructions in a code block"},
    	    {"boolexp", "Short for Boolean Expression"},
    	    {"cascade", "An if-else if-else chain can form this structure"},
    	    {"resolve", "To determine the final boolean value of an expression"},
    	    {"logicop", "Short for Logical Operator"},
    	    {"control", "Control flow statements direct program execution"},

    	    // 8-Letter Words
    	    {"notequal", "Relational operator !=, tests for inequality"},
    	    {"lessoreq", "Relational operator <= (less than or equal to)"},
    	    {"relation", "A comparison between values, e.g., less than, equal to"},
    	    {"compound", "A condition formed by joining multiple conditions"},
    	    {"evaluate", "To determine the boolean result of an expression"},
    	    {"operator", "A symbol (e.g., &&, ==, <) that performs an operation"},
    	    {"grouping", "Using parentheses () to control evaluation order"},
    	    {"dangling", "Refers to the 'dangling else' ambiguity problem"},
    	    {"demorgan", "De Morgan's laws for simplifying boolean expressions"},
    	    {"flowpath", "The specific route of execution through conditional logic"},
    	    {"boologic", "Abbreviation for Boolean Logic"},
    	    {"opposite", "The 'not' operator gives the ___ boolean value"},

    	    // 9-Letter Words
    	    {"condition", "An expression that evaluates to true or false"},
    	    {"greatereq", "Relational operator >= (greater than or equal to)"},
    	    {"branching", "The act of choosing between different paths of execution"},
    	    {"exclusive", "Mutually ___ conditions: only one can be true (XOR idea)"},
    	    {"statement", "A complete unit of execution, like an 'if' statement"},
    	    {"selection", "A control structure that chooses which code to run"},
    	    {"structure", "Control ___ like if-else directs program flow"},
    	    {"predicate", "A method or expression that returns a boolean value"},
    	    {"alternate", "An alternative path in an if-else structure"},
    	    {"indenting", "Formatting code to show nesting levels visually"},
    	    {"shortfall", "When short-circuiting stops evaluation early"}, // Creative clue for short-circuit
    	    {"certainty", "The goal of evaluating a boolean condition"},

    	    // 10-Letter Words
    	    {"comparison", "The act of comparing two values, yields a boolean"},
    	    {"relational", "Type of operator that compares values (e.g., >, <, ==)"},
    	    {"truthtable", "A table showing all outcomes of a boolean expression"},
    	    {"precedence", "Operator ___ rules determine evaluation order"},
    	    {"expression", "Code that evaluates to a value, often boolean in ifs"},
    	    {"circuiting", "Short-___ evaluation (&&, ||) stops when outcome is known"},
    	    {"nestedelse", "An 'else' that belongs to an inner 'if' statement"},
    	    {"equivalent", "Two boolean expressions are ___ if they have identical truth tables"},
    	    {"sequential", "Default execution order, one statement after another"},
    	    {"consequent", "The block of code executed if an 'if' condition is true"},
    	    {"exhaustive", "Checking all possible conditions or paths"},
    	};

    	unit_4 = new String[][] {

            // --- Words of Length 2 ---
            {"do", "Keyword used to begin a do-while loop, guaranteeing at least one execution."},
            {"OR", "Logical operator (||) used to combine boolean expressions; true if at least one is true."},
            {"EQ", "Relational operator (==) used to check if two values are equal."},
            {"NE", "Relational operator (!=) used to check if two values are not equal."},
            {"GT", "Relational operator (>) used to check if the left operand is greater than the right."},
            {"LT", "Relational operator (<) used to check if the left operand is less than the right."},
            {"GE", "Relational operator (>=) used to check if the left operand is greater than or equal to the right."},
            {"LE", "Relational operator (<=) used to check if the left operand is less than or equal to the right."},
            {"go", "Informal term for starting or continuing a process, like loop execution."}, // Added for variety

            // --- Words of Length 3 ---
            {"for", "Loop structure commonly used when the number of repetitions is known."},
            {"int", "Primitive data type frequently used for loop counter variables."},
            {"sum", "Variable used in an accumulator pattern to aggregate values."},
            {"end", "The point at which a loop's execution is completed."},
            {"AND", "Logical operator (&&) used to combine boolean expressions; true only if both are true."},
            {"NOT", "Logical operator (!) used to invert a boolean value."},
            {"run", "To execute the code within a loop's body."}, // Added for variety
            {"key", "A significant word or value, like a keyword or sentinel value."}, // Added for variety

            // --- Words of Length 4 ---
            {"loop", "A control structure for repeating a block of code."},
            {"body", "The block of statements executed within a loop."},
            {"flag", "A boolean variable used to signal a condition or state, often controlling loop flow."},
            {"exit", "To terminate the execution of a loop prematurely."},
            {"step", "The amount by which a loop control variable is modified in each iteration."},
            {"test", "The boolean expression evaluated to decide if a loop continues or stops."},
            {"true", "Boolean value that typically allows a while or do-while loop to proceed."},
            {"stop", "The action of causing a loop to cease repeating."},
            {"flow", "The order in which statements are executed (control flow)."},
            {"pass", "One complete cycle through a loop's body."}, // Synonym for iteration
            {"byte", "Smallest integer primitive type; less common for loop counters."},
            {"char", "Primitive type for single characters; can be iterated over in sequences."},
            {"void", "Keyword indicating a method does not return a value, relevant to methods with loops."},
            {"long", "Larger integer type for potentially large loop counts."},
            {"null", "Value indicating a reference variable points to no object; can be relevant in loop conditions checking for object existence."},
            {"code", "The set of instructions that make up a program, including loops."}, // Added for variety
            {"data", "Information processed by a program, often within loops."}, // Added for variety
            {"next", "Refers to proceeding to the subsequent iteration of a loop."}, // Added for variety

            // --- Words of Length 5 ---
            {"while", "Loop structure that repeats as long as its condition is true, checked before each iteration."},
            {"break", "Statement to immediately exit the innermost loop or switch."},
            {"index", "Numerical position used to access elements in arrays or strings, common in for loops."},
            {"scope", "The region of a program where a variable is accessible."},
            {"trace", "Step-by-step simulation of code execution, useful for debugging loops."},
            {"range", "The set of values a loop counter can take, defined by its start and end."},
            {"count", "To keep track of the number of times a loop or event occurs."},
            {"value", "The data stored in a variable at a specific time."},
            {"final", "Keyword for variables whose value is constant after initialization."},
            {"start", "The initial point or value where a loop begins."},
            {"false", "Boolean value that typically causes a while or do-while loop to terminate."},
            {"cycle", "One complete repetition of a loop's process."}, // Synonym for iteration
            {"check", "The act of evaluating a loop's boolean condition."},
            {"event", "A condition change that controls an event-controlled loop."},
            {"fixed", "Describes a loop designed for a set number of repetitions."}, // Fixed-count loop
            {"block", "A group of statements enclosed by {}."},
            {"logic", "Errors causing incorrect program behavior, often in loop conditions/updates."}, // Logic error
            {"error", "A mistake preventing correct program execution or output."},
            {"total", "Variable used in an accumulator pattern."}, // Synonym for sum
            {"limit", "A boundary value for a loop counter or condition."},
            {"entry", "Describes a loop where the condition is checked before the first iteration."}, // Entry-controlled
            {"valid", "Describes a condition that allows loop continuation."},
            {"state", "The values of variables at a specific point in execution."},
            {"print", "To display output, often done repeatedly inside a loop."}, // Added for variety
            {"input", "Data received by the program, which can influence loop conditions."}, // Added for variety
            {"until", "Used in some contexts to describe a loop that runs until a condition is met (though not a Java keyword)."}, // Added for variety

            // --- Words of Length 6 ---
            {"nested", "A loop placed entirely within the body of another loop."},
            {"update", "The part of a loop that modifies the control variable, moving towards termination."},
            {"syntax", "Rules for structuring code elements, including loops."},
            {"repeat", "To perform an action multiple times."},
            {"ending", "The condition or point that signals loop completion."},
            {"parens", "Parentheses (), used around loop conditions and for loop headers."},
            {"execute", "To run the instructions in a loop's body."},
            {"inside", "Refers to code or variables within a loop's body."},
            {"modify", "To change a variable's value or state."},
            {"assign", "To store a value in a variable (=)."},
            {"header", "The first line of a for loop (initialization, condition, update)."},
            {"output", "Data produced by the program, often iteratively."},
            {"return", "Statement to exit a method; can affect loops within the method."},
            {"method", "A reusable block of code, potentially containing loops."},
            {"length", "Number of elements in an array/string, used for loop bounds."},
            {"finish", "To successfully complete a loop's iterations."},
            {"always", "Describes a condition that is perpetually true, leading to an infinite loop."}, // Added for variety
            {"escape", "To break out of a loop prematurely."}, // Added for variety
            {"before", "Describes a loop (like while) where the condition is checked before the body."}, // Added for variety

            // --- Words of Length 7 ---
            {"counter", "Variable used to count loop iterations."},
            {"control", "Management of execution order (control flow)."},
            {"boolean", "Data type (true/false) used for loop conditions."},
            {"looping", "The process of repeatedly executing code."},
            {"countup", "Increasing a loop counter's value."},
            {"loopvar", "Variable managing loop progress."}, // Synonym for control variable
            {"iterate", "To perform one cycle of a loop."},
            {"declare", "To create a variable (type and name)."},
            {"outside", "Code/variables before or after a loop structure."},
            {"running", "Describes an accumulator variable."}, // Running total
            {"sentinel", "Value marking the end of data, controlling an event-controlled loop."},
            {"compare", "To check the relationship between values using relational operators."},
            {"current", "The value of a variable at a specific moment."},
            {"process", "A sequence of operations, often repeated in a loop."}, // Added for variety
            {"perform", "To carry out an action or instruction within a loop."}, // Added for variety
            {"initial", "The starting value or state."}, // Added for variety

            // --- Words of Length 8 ---
            {"continue", "Statement skipping the rest of the current iteration and going to the next."},
            {"infinite", "Describes a loop that never terminates."},
            {"offbyone", "Error where a loop runs one extra or one too few times."},
            {"variable", "A named memory location storing changeable data."},
            {"boundary", "Start or end value defining loop limits."},
            {"stepwise", "Execution mode pausing after each statement (debugging)."}, // Related to tracing
            {"totaling", "Using an accumulator to sum values from iterations."},
            {"evaluate", "To determine the result of an expression, like a condition."},
            {"progress", "Movement towards the loop's termination condition."},
            {"constant", "A variable with a fixed value ('final')."},
            {"sequence", "Statements executed in order, characteristic of a loop body."}, // Added for variety
            {"debugger", "Tool used for step-by-step execution and tracing."}, // Added for variety
            {"strictly", "Used with < or > to indicate the boundary is not included."}, // Added for variety

            // --- Words of Length 9 ---
            {"increment", "To increase a numerical variable, typically by 1 (e.g., i++)."},
            {"decrement", "To decrease a numerical variable, typically by 1 (e.g., i--)."},
            {"iteration", "A single complete execution of a loop's body."},
            {"condition", "Boolean expression controlling loop execution."},
            {"statement", "A complete instruction in a program."},
            {"structure", "The organization of code elements, like a loop's components."},
            {"countdown", "Decreasing a loop counter towards a lower limit."},
            {"whileloop", "Loop where condition is checked before each iteration."},
            {"execution", "The process of running a program's instructions."},
            {"operation", "An action or computation performed by the program."},
            {"terminate", "To cause a loop to stop executing."}, // Added for variety
            {"evaluate", "To determine the value of an expression."}, // Already used length 8, adding synonym/related concept
            {"logical", "Refers to boolean expressions and operators used in conditions."}, // Added for variety

            // --- Words of Length 10 ---
            {"initialize", "To assign an initial value to a variable."},
            {"dowhileloop", "Loop where the body executes at least once before the condition is checked at the end."},
            {"controlvar", "The variable managing loop execution."}, // Synonym for control variable
            {"comparison", "Checking the relationship between values using relational operators."},
            {"terminates", "Describes the event when a loop finishes."},
            {"repeating", "The characteristic of a loop executing multiple times."},
            {"controlled", "Describes how a loop's execution is managed (e.g., event-_____)."},
            {"accumulate", "To gather or total values over loop iterations."}, // Added for variety
            {"expression", "A combination of values, variables, and operators that evaluates to a single value."}, // Loop conditions are boolean expressions
            {"loopheader", "The initial line of a for loop containing control elements."}, // Synonym for header
            {"nestedloop", "A loop placed inside another loop."}, // Synonym for nested
            {"loopbody", "The statements executed within a loop."}, // Synonym for body
            {"exitcondition", "The logical expression that ends a loop."}, // Synonym for termination condition
            {"loopindex", "The numeric position used in iteration."}, // Synonym for index
            {"variabletrace", "Tracking variable values during loop execution."}, // Synonym for trace
            {"fixedcount", "Type of loop that runs a known number of times."}, // Synonym for fixed
            {"eventdriven", "Describes loops that continue based on external events or conditions (similar to event-controlled)."} // Added for variety
        };

        unit_5 = new String[][] {

            // --- Words of Length 2 ---
            {"new", "Keyword used to create an instance of a class."},
            {"is", "Often used conceptually in 'is-a' relationships (inheritance, Unit 9)."}, // Related concept
            {"id", "Short for identifier, used for variable or method names."}, // General programming term
            {"it", "Refers to an object instance in descriptions."}, // Informal reference

            // --- Words of Length 3 ---
            {"get", "Common prefix for accessor methods."},
            {"set", "Common prefix for mutator methods."},
            {"dot", "Operator (.) used to access members of an object."},
            {"obj", "Common abbreviation for object."}, // Informal
            {"run", "To execute a method or program."}, // General programming term
            {"key", "Significant word like a keyword or identifier."}, // General programming term

            // --- Words of Length 4 ---
            {"this", "Reference to the current object instance within a method or constructor."},
            {"void", "Return type indicating a method does not return a value."},
            {"data", "Information stored in an object's instance variables."},
            {"null", "Value indicating an object reference does not point to an object."},
            {"code", "The set of instructions defining a class or method."},
            {"name", "Identifier given to a class, variable, or method."},
            {"type", "Specifies the kind of data a variable can hold or a method can return."},
            {"call", "To invoke a method."},
            {"main", "The method where program execution typically begins."}, // Relevant when creating objects in main
            {"from", "Used in phrases like 'created from a class'."}, // Informal connection

            // --- Words of Length 5 ---
            {"class", "Defines a blueprint for creating objects."},
            {"state", "The current values of an object's instance variables."},
            {"field", "Another name for an instance variable."},
            {"final", "Keyword making a variable's value constant after initialization."},
            {"print", "Method used to display output, often called on objects."}, // System.out.print
            {"input", "Data provided to a method or program."},
            {"scope", "The region where a variable or method is accessible."},
            {"value", "Data stored in a variable."},
            {"param", "Short for parameter."}, // Informal abbreviation
            {"javac", "The Java compiler command."}, // Relevant to compiling classes
            {"model", "Often refers to a class representing data or a concept."}, // Design pattern term
            {"chain", "Calling one constructor from another using 'this()'."}, // Constructor chaining

            // --- Words of Length 6 ---
            {"object", "An instance of a class."},
            {"public", "Access modifier allowing access from any other class."},
            {"method", "A block of code within a class that performs a task."},
            {"return", "Keyword used to send a value back from a method."},
            {"define", "To create or specify the structure of a class or method."},
            {"create", "To instantiate an object using the 'new' keyword."},
            {"access", "To get or modify the value of an instance variable or call a method."},
            {"static", "Keyword for members belonging to the class itself, not specific instances."}, // Important concept in Unit 5/6
            {"string", "A class representing sequences of characters, often used with objects."}, // Common object type
            {"double", "Primitive data type, can be used for instance variables."},
            {"import", "Statement to use classes from other packages."}, // Relevant when using library classes
            {"invoke", "Another term for calling a method."}, // Synonym for call
            {"syntax", "The rules for writing valid code."}, // General programming term

            // --- Words of Length 7 ---
            {"private", "Access modifier restricting access to within the class."},
            {"mutator", "A method that changes the state (instance variables) of an object."},
            {"boolean", "Primitive type, can be an instance variable or parameter type."},
            {"integer", "Whole number primitive type (int), often used for instance variables."}, // Synonym for int
            {"declare", "To create a variable or method by specifying its type and name."},
            {"outside", "Refers to code in other classes that might interact with an object."},
            {"initial", "The starting value assigned during initialization."},
            {"keyword", "A reserved word in Java with a specific meaning."}, // 'class', 'new', 'public', 'private', etc.
            {"compile", "To translate source code into bytecode."}, // Relevant to class files
            {"execute", "To run the compiled code."}, // General programming term
            {"program", "A set of instructions, often using classes and objects."}, // General programming term
            {"display", "To show output, often using methods."}, // Synonym for print

            // --- Words of Length 8 ---
            {"accessor", "A method that retrieves the value of an instance variable."},
            {"behavior", "What an object can do, defined by its methods."},
            {"instance", "A specific object created from a class blueprint."},
            {"javabean", "A class following specific conventions (private fields, public getters/setters)."},
            {"overload", "Having multiple methods or constructors with the same name but different parameters."}, // Method/Constructor overloading
            {"parameter", "A variable declared in a method or constructor signature that receives a value."},
            {"attribute", "Another name for an instance variable or field."}, // Synonym for field/instance variable
            {"allocate", "To reserve memory space for an object using 'new'."}, // Memory allocation
            {"strictly", "Used with access modifiers to describe tight restrictions."}, // Informal connection
            {"identity", "Refers to which specific object an object reference points to."}, // Object identity

            // --- Words of Length 9 ---
            {"constructor", "Special method used to initialize a new object when it's created."},
            {"signature", "Includes the method name and parameter types, used to distinguish overloaded methods."}, // Method signature
            {"blueprint", "A metaphor for a class, illustrating its role in creating objects."},
            {"reference", "A variable that stores the memory address of an object."}, // Object reference
            {"shadowing", "When a local variable or parameter has the same name as an instance variable."},
            {"execution", "The process of running a program or method."},
            {"operation", "An action performed by a method."}, // Synonym for task/behavior
            {"instantiate", "To create an object from a class using the 'new' keyword."}, // Synonym for create
            {"structure", "The organization of a class (fields, constructors, methods)."}, // Class structure

            // --- Words of Length 10 ---
            {"encapsulate", "To bundle data (fields) and methods that operate on the data within a single unit (a class)."}, // Verb form of encapsulation
            {"initialize", "To assign an initial value to a variable, often done in constructors."},
            {"default", "Refers to the constructor with no parameters, automatically provided if no other constructors are defined."}, // Default constructor
            {"overloaded", "Describes methods or constructors with the same name but different parameter lists."},
            {"abstraction", "Hiding complex implementation details and showing only essential features."},
            {"objectref", "A variable that points to an object in memory."}, // Synonym for object reference
            {"definition", "The code that specifies the structure and behavior of a class or method."}, // Class definition
            {"accessible", "Describes members that can be used from a particular location based on access modifiers."},
            {"tostring", "A common method used to provide a string representation of an object."}, // toString method
            {"classfield", "An instance variable defined within a class."}, // Synonym for instance variable/field
            {"cohesion", "Principle where a class has a single, well-defined purpose."},
            {"modular", "Code organized into independent, reusable units like classes."},
            {"responsibility", "A task or duty assigned to a class or method."} // Responsibility-driven design
        };

        
        unit_6 = new String[][] {

            // --- Words of Length 2 ---
            {"at", "Used in method names like get___ or set___ to specify an index."}, // get(int index), set(int index, E element)
            {"of", "Used in phrases like 'list ___ integers'."}, // Informal connection
            {"is", "Used in methods like isEmpty() to check a boolean condition."}, // isEmpty()
            {"it", "Refers to an element or the list itself in descriptions."}, // Informal reference
            {"in", "Used in phrases like 'element ___ the list'."}, // Informal connection

            // --- Words of Length 3 ---
            {"add", "Method to insert an element into an ArrayList."}, // add(E element), add(int index, E element)
            {"get", "Method to retrieve an element from an ArrayList at a specific index."}, // get(int index)
            {"set", "Method to replace an element at a specific index in an ArrayList."}, // set(int index, E element)
            {"rem", "Short for remove, a method to delete elements."}, // Informal abbreviation for remove
            {"idx", "Short for index."}, // Informal abbreviation
            {"new", "Keyword used to create a new ArrayList object."}, // new ArrayList<>()

            // --- Words of Length 4 ---
            {"size", "Method that returns the number of elements in an ArrayList."}, // size()
            {"list", "A common name for an ArrayList variable."}, // ArrayList<E> list = ...
            {"null", "Value that an object reference can hold if it doesn't point to an object."}, // ArrayList can store null references
            {"code", "The program instructions, including those using ArrayLists."},
            {"name", "Identifier for an ArrayList variable or method."},
            {"type", "Specifies the kind of elements an ArrayList can hold (e.g., Integer, String)."}, // Generic type <E>
            {"true", "Boolean value returned by some ArrayList methods (e.g., add, remove)."},
            {"void", "Return type of some ArrayList methods (e.g., add(int, E), clear())."}, // add(int, E), clear()
            {"from", "Used in phrases like 'remove ___ the list'."}, // Informal connection
            {"loop", "Control structure often used to iterate through ArrayList elements."}, // for loop, enhanced for loop
            {"each", "Used in the context of processing 'each' element in a list (enhanced for loop)."}, // Enhanced for loop
            {"data", "The elements stored within an ArrayList."},

            // --- Words of Length 5 ---
            {"index", "A zero-based numerical position of an element in an ArrayList."},
            {"clear", "Method to remove all elements from an ArrayList."}, // clear()
            {"empty", "Describes an ArrayList that contains no elements."}, // isEmpty()
            {"value", "The data stored in an element of an ArrayList."},
            {"param", "Short for parameter, used in method calls."},
            {"array", "A fixed-size data structure, contrasted with ArrayList."}, // Contrast with array
            {"print", "Method to display the contents of an ArrayList or its elements."}, // System.out.print, System.out.println
            {"addall", "Method to add all elements from another collection to an ArrayList."}, // addAll(Collection<? extends E> c)
            {"check", "To verify a condition, like if a list is empty or contains an element."}, // isEmpty(), contains()
            {"bound", "Refers to the valid range of indices (0 to size() - 1)."}, // Index out of bounds
            {"valid", "Describes an index that is within the acceptable range for an ArrayList."}, // Valid index

            // --- Words of Length 6 ---
            {"remove", "Method to delete an element from an ArrayList by index or by value."}, // remove(int index), remove(Object o)
            {"object", "ArrayLists store references to these, not primitive values directly."}, // ArrayList<Object> or specific object types
            {"public", "Access modifier for ArrayList methods allowing external use."},
            {"method", "A procedure that performs an action on an ArrayList."},
            {"return", "Keyword used by methods to send back a value (e.g., get, remove)."},
            {"define", "To declare an ArrayList variable."},
            {"create", "To instantiate an ArrayList using 'new'."},
            {"access", "To retrieve or modify an element using its index."},
            {"string", "A common type of object stored in ArrayLists."}, // ArrayList<String>
            {"double", "Primitive type, but ArrayLists store its wrapper class, Double."}, // ArrayList<Double>
            {"import", "Statement needed to use the ArrayList class."},
            {"invoke", "Another term for calling an ArrayList method."}, // Synonym for call
            {"syntax", "The rules for writing code using ArrayLists."},
            {"insert", "To add an element at a specific position in the list."}, // Synonym for add(int, E)
            {"modify", "To change an element's value using the set method."}, // Synonym for set
            {"length", "A property of arrays, contrasted with ArrayList's size() method."}, // Contrast with array

            // --- Words of Length 7 ---
            {"private", "Access modifier often used for ArrayList instance variables within a class."},
            {"boolean", "Return type of methods like add, remove (by object), and isEmpty."},
            {"integer", "Wrapper class for the int primitive type, commonly stored in ArrayLists."}, // ArrayList<Integer>
            {"declare", "To specify the type and name of an ArrayList variable."},
            {"outside", "Refers to code external to where an ArrayList is declared or used."},
            {"initial", "The state of an ArrayList when it is first created (empty)."},
            {"keyword", "Reserved words like 'new', 'import', 'public', 'private'."},
            {"compile", "To translate code using ArrayLists into bytecode."},
            {"execute", "To run a program that uses ArrayLists."},
            {"program", "A set of instructions, potentially using ArrayLists."},
            {"display", "To show the contents of an ArrayList."}, // Synonym for print
            {"wrapper", "Classes like Integer, Double, Boolean used to store primitive values in ArrayLists."}, // Wrapper class
            {"element", "An individual item stored in an ArrayList."},
            {"compare", "To check if two ArrayLists or elements are equal or have a relationship."}, // equals() method

            // --- Words of Length 8 ---
            {"javadoc", "Documentation for Java code, including ArrayList methods."}, // Javadoc comments
            {"capacity", "The internal size of the array used by ArrayList, which can grow."}, // Internal capacity
            {"addindex", "Method to add an element at a specific position."}, // add(int index, E element)
            {"removeby", "Refers to removing an element either by index or by object."}, // remove(int index) or remove(Object o)
            {"allocate", "To reserve memory for an ArrayList object using 'new'."},
            {"identity", "Refers to which specific ArrayList object a reference points to."},
            {"contains", "Method to check if an ArrayList includes a specific element."}, // contains(Object o)
            {"isempty", "Method to check if an ArrayList has no elements."}, // isEmpty()
            {"sizezero", "Describes an empty ArrayList where size() returns 0."}, // size() == 0
            {"retrieve", "To get an element from an ArrayList using its index."}, // Synonym for get

            // --- Words of Length 9 ---
            {"arraylist", "A resizable array implementation in Java."}, // The class name
            {"signature", "Includes the method name and parameter types, distinguishing methods."}, // Method signature
            {"reference", "A variable that stores the memory address of an ArrayList object."},
            {"execution", "The process of running code that uses ArrayLists."},
            {"operation", "An action performed on an ArrayList, like adding or removing."},
            {"instantiate", "To create an ArrayList object using 'new'."}, // Synonym for create
            {"structure", "The organization of data within an ArrayList."}, // Data structure
            {"exception", "An event that disrupts normal program flow, like IndexOutOfBoundsException."}, // Exceptions
            {"outofbound", "Describes an index that is not valid for an ArrayList."}, // Index out of bounds
            {"resizable", "Characteristic of an ArrayList that can change its size."}, // Resizable array

            // --- Words of Length 10 ---
            {"collection", "ArrayList is part of the Java Collections Framework."}, // Collections Framework
            {"definition", "The code that specifies the structure and behavior of the ArrayList class (or your code using it)."},
            {"accessible", "Describes ArrayLists or their elements that can be used based on scope and modifiers."},
            {"tostring", "Method often overridden to provide a string representation of an ArrayList's contents."}, // toString() method
            {"addelement", "Method to add a single element to an ArrayList."}, // add(E element)
            {"removeobj", "Method to remove the first occurrence of a specific object from an ArrayList."}, // remove(Object o)
            {"indexof", "Method to find the index of the first occurrence of a specific element."}, // indexOf(Object o)
            {"lastindex", "Method to find the index of the last occurrence of a specific element."}, // lastIndexOf(Object o)
            {"sublist", "Method that returns a view of a portion of the ArrayList."}, // subList(int fromIndex, int toIndex)
            {"iteration", "One cycle of processing elements in an ArrayList, often with a loop."}, // Loop iteration
            {"processing", "Performing operations on elements within an ArrayList, typically using loops."} // Data processing
        };
        
        
        unit_7 = new String[][] {

            // --- Words of Length 2 ---
            {"at", "Used conceptually to refer to an element's position in an array."}, // Informal connection
            {"of", "Used in phrases like 'array ___ integers'."}, // Informal connection
            {"is", "Used in boolean checks related to array state or elements."}, // General programming term
            {"it", "Refers to an element or the array itself in descriptions."}, // Informal reference
            {"in", "Used in phrases like 'element ___ the array'."}, // Informal connection
            {"go", "Informal term for traversing or processing an array."}, // Informal connection

            // --- Words of Length 3 ---
            {"int", "Primitive data type commonly stored in arrays."},
            {"new", "Keyword used to create a new array object."},
            {"get", "Conceptual term for accessing an element at an index (using [])."}, // Accessing with []
            {"set", "Conceptual term for modifying an element at an index (using [])."}, // Modifying with []
            {"idx", "Short for index."}, // Informal abbreviation
            {"sum", "Variable used in an accumulator pattern when processing array elements."}, // Accumulating sum

            // --- Words of Length 4 ---
            {"size", "A property of an array ('.length') that indicates the number of elements."}, // .length property
            {"null", "Value that an array variable can hold if it doesn't point to an array object."},
            {"code", "The program instructions, including those using arrays."},
            {"name", "Identifier for an array variable."},
            {"type", "Specifies the kind of elements an array can hold (e.g., int, String)."}, // Element type
            {"loop", "Control structure commonly used to iterate through array elements."}, // for loop, enhanced for loop
            {"each", "Used in the context of processing 'each' element in an array (enhanced for loop)."}, // Enhanced for loop
            {"data", "The elements stored within an array."},
            {"dims", "Short for dimensions, referring to 1D or 2D arrays."}, // Informal abbreviation
            {"zero", "The starting index of an array."}, // Zero-based indexing
            {"last", "Refers to the element at index length - 1."}, // Last element

            // --- Words of Length 5 ---
            {"index", "A zero-based numerical position used to access an element in an array."},
            {"array", "A fixed-size, sequential collection of elements of the same data type."},
            {"value", "The data stored in an element of an array."},
            {"param", "Short for parameter, an array can be passed as a parameter."}, // Array parameter
            {"print", "Method to display the contents of an array or its elements."}, // System.out.print, System.out.println
            {"check", "To verify a condition related to array elements or indices."},
            {"bound", "Refers to the valid range of indices (0 to length - 1)."}, // Index out of bounds
            {"valid", "Describes an index that is within the acceptable range for an array."}, // Valid index
            {"fixed", "Describes the size of an array after it is created."}, // Fixed size
            {"store", "To place a value into an array element at a specific index."}, // Storing elements
            {"fetch", "To retrieve a value from an array element at a specific index."}, // Synonym for access/get
            {"table", "Conceptual representation of a 2D array."}, // 2D array as a table

            // --- Words of Length 6 ---
            {"length", "A public final field of an array that stores the number of elements."}, // .length
            {"object", "Arrays can store references to these, not just primitive values."}, // Array of objects
            {"public", "Access modifier, array variables are often declared public or private."},
            {"method", "A procedure that might take an array as a parameter or return an array."},
            {"return", "Keyword used by methods that return an array or an element from an array."},
            {"define", "To declare an array variable."},
            {"create", "To instantiate an array using 'new'."},
            {"access", "To retrieve or modify an element using its index (using [])."},
            {"string", "A common type of object stored in arrays."}, // Array of Strings
            {"double", "Primitive type, can be stored directly in a double array."}, // Array of doubles
            {"invoke", "Another term for calling a method that uses arrays."}, // Synonym for call
            {"syntax", "The rules for writing code using arrays (e.g., int[] arr = ...)."},
            {"insert", "Conceptual term for placing an element into an array (requires shifting or creating a new array)."}, // Conceptual insert
            {"modify", "To change an element's value using the assignment operator with an index."}, // Synonym for set
            {"assign", "To store a value in an array element using the assignment operator."}, // Assignment
            {"bounds", "The limits of valid indices in an array."}, // Array bounds

            // --- Words of Length 7 ---
            {"private", "Access modifier often used for array instance variables within a class."},
            {"boolean", "Primitive type, can be stored directly in a boolean array."}, // Array of booleans
            {"integer", "Wrapper class for int, but arrays can store int primitives directly."}, // int[] vs Integer[]
            {"declare", "To specify the type and name of an array variable."},
            {"outside", "Refers to code external to where an array is declared or used."},
            {"initial", "The default value of elements when an array is created (e.g., 0 for int, null for objects)."}, // Default initial values
            {"keyword", "Reserved words like 'new', 'int', 'public', 'private'."},
            {"compile", "To translate code using arrays into bytecode."},
            {"execute", "To run a program that uses arrays."},
            {"program", "A set of instructions, potentially using arrays."},
            {"display", "To show the contents of an array."}, // Synonym for print
            {"element", "An individual item stored in an array."},
            {"compare", "To check if two arrays or elements are equal or have a relationship."}, // Comparing arrays/elements
            {"literal", "A fixed value or sequence used to initialize an array (e.g., {1, 2, 3})."}, // Array literal

            // --- Words of Length 8 ---
            {"javadoc", "Documentation for Java code, including methods that use arrays."}, // Javadoc comments
            {"outofbnd", "Short for Index Out Of Bounds, a common array error."}, // Informal abbreviation
            {"allocate", "To reserve memory for an array object using 'new'."},
            {"identity", "Refers to which specific array object a reference points to."},
            {"retrieve", "To get an element from an array using its index."}, // Synonym for access/get
            {"traverse", "To visit each element in an array, typically using a loop."}, // Array traversal
            {"subscript", "Another term for the index used to access array elements."}, // Subscript operator []
            {"onedim", "Short for one-dimensional array."}, // Informal abbreviation
            {"twodim", "Short for two-dimensional array."}, // Informal abbreviation
            {"rowmajor", "Order of processing elements in a 2D array (by row)."}, // 2D array traversal
            {"colmajor", "Order of processing elements in a 2D array (by column)."}, // 2D array traversal

            // --- Words of Length 9 ---
            {"exception", "An event that disrupts normal program flow, like ArrayIndexOutOfBoundsException."}, // Exceptions
            {"outofbnds", "Short for Index Out Of Bounds, a common array error."}, // Informal abbreviation (alternative)
            {"reference", "A variable that stores the memory address of an array object."},
            {"execution", "The process of running code that uses arrays."},
            {"operation", "An action performed on an array, like accessing or modifying elements."},
            {"instantiate", "To create an array object using 'new'."}, // Synonym for create
            {"structure", "The organization of data within an array."}, // Data structure
            {"processor", "Code (like a loop) that performs operations on array elements."}, // Array processor
            {"primitive", "Data types like int, boolean, double that can be stored directly in arrays."}, // Primitive types

            // --- Words of Length 10 ---
            {"definition", "The code that specifies the structure and behavior of your classes using arrays."},
            {"accessible", "Describes arrays or their elements that can be used based on scope and modifiers."},
            {"tostring", "Method often used to provide a string representation of an array's contents (requires helper methods like Arrays.toString())."}, // toString() method (needs helper)
            {"addelement", "Conceptual term for adding an element to an array (requires creating a new array)."}, // Conceptual add
            {"removeelem", "Conceptual term for removing an element from an array (requires shifting or creating a new array)."}, // Conceptual remove
            {"processing", "Performing operations on elements within an array, typically using loops."}, // Data processing
            {"dimensions", "Refers to the number of indices needed to access an element (e.g., one for 1D, two for 2D)."}, // Dimensions
            {"twodarray", "A common term for a two-dimensional array."}, // Synonym for 2D array
            {"onedarray", "A common term for a one-dimensional array."}, // Synonym for 1D array
            {"arraycopy", "Method in the System class to copy elements from one array to another."}, // System.arraycopy
            {"arrayindex", "The position used to access an element in an array."}, // Synonym for index
            {"outofbounds", "Describes an index that is not valid for an array, causing an error."} // Index out of bounds (full term)
        };

        unit_8 = new String[][] {

            // --- Words of Length 2 ---
            {"at", "Used conceptually to refer to an element's position in a 2D array (at row, col)."}, // Informal connection
            {"of", "Used in phrases like 'array ___ arrays'."}, // Informal connection
            {"is", "Used in boolean checks related to 2D array state or elements."}, // General programming term
            {"it", "Refers to an element or the 2D array itself in descriptions."}, // Informal reference
            {"in", "Used in phrases like 'element ___ the grid'."}, // Informal connection
            {"go", "Informal term for traversing or processing a 2D array."}, // Informal connection
            {"rc", "Short for row and column."}, // Informal abbreviation

            // --- Words of Length 3 ---
            {"int", "Primitive data type commonly stored in 2D arrays."},
            {"new", "Keyword used to create a new 2D array object."},
            {"get", "Conceptual term for accessing an element at a specific row and column (using [][])."}, // Accessing with [r][c]
            {"set", "Conceptual term for modifying an element at a specific row and column (using [][])."}, // Modifying with [r][c]
            {"row", "The horizontal dimension of a 2D array."},
            {"col", "The vertical dimension of a 2D array."}, // Short for column
            {"sum", "Variable used in an accumulator pattern when processing 2D array elements."}, // Accumulating sum
            {"dim", "Short for dimension, referring to the number of indices needed (two for 2D)."}, // Informal abbreviation

            // --- Words of Length 4 ---
            {"size", "A property of a 1D array ('.length'), used to get the number of columns in a row of a 2D array."}, // array[r].length
            {"null", "Value that a 2D array variable or elements storing objects can hold if they don't point to an object."},
            {"code", "The program instructions, including those using 2D arrays."},
            {"name", "Identifier for a 2D array variable."},
            {"type", "Specifies the kind of elements a 2D array can hold (e.g., int, String)."}, // Element type
            {"loop", "Control structure commonly used to iterate through 2D array elements (often nested)."}, // for loop, enhanced for loop
            {"each", "Used in the context of processing 'each' element in a grid (enhanced for loop)."}, // Enhanced for loop
            {"data", "The elements stored within a 2D array."},
            {"dims", "Short for dimensions, referring to the two dimensions of a 2D array."}, // Informal abbreviation
            {"zero", "The starting index for both rows and columns."}, // Zero-based indexing
            {"grid", "A common metaphor for a 2D array."}, // 2D array as a grid
            {"cell", "An individual element at a specific row and column in a 2D array."}, // Synonym for element

            // --- Words of Length 5 ---
            {"index", "A numerical position used to access an element, either row or column."},
            {"array", "A fixed-size, sequential collection; a 2D array is an array of these."}, // Array of arrays
            {"value", "The data stored in an element of a 2D array."},
            {"param", "Short for parameter, a 2D array can be passed as a parameter."}, // 2D Array parameter
            {"print", "Method to display the contents of a 2D array or its elements."}, // System.out.print, System.out.println
            {"check", "To verify a condition related to 2D array elements, rows, or columns."},
            {"bound", "Refers to the valid range of indices for rows or columns (0 to length - 1)."}, // Index out of bounds
            {"valid", "Describes a row or column index that is within the acceptable range for a 2D array."}, // Valid index
            {"fixed", "Describes the size of a 2D array's rows and columns after it is created."}, // Fixed size
            {"store", "To place a value into a 2D array element at a specific row and column."}, // Storing elements
            {"fetch", "To retrieve a value from a 2D array element at a specific row and column."}, // Synonym for access/get
            {"table", "Conceptual representation of a 2D array with rows and columns."}, // 2D array as a table
            {"major", "Used in terms like row-major or column-major order."}, // Traversal order

            // --- Words of Length 6 ---
            {"length", "A public final field; `array.length` gives rows, `array[r].length` gives columns."}, // .length property
            {"object", "2D arrays can store references to these, not just primitive values."}, // 2D Array of objects
            {"public", "Access modifier, 2D array variables are often declared public or private."},
            {"method", "A procedure that might take a 2D array as a parameter or return a 2D array."},
            {"return", "Keyword used by methods that return a 2D array or an element from one."},
            {"define", "To declare a 2D array variable."},
            {"create", "To instantiate a 2D array using 'new'."},
            {"access", "To retrieve or modify an element using its row and column indices (using [][])."},
            {"string", "A common type of object stored in 2D arrays."}, // 2D Array of Strings
            {"double", "Primitive type, can be stored directly in a 2D double array."}, // 2D Array of doubles
            {"invoke", "Another term for calling a method that uses 2D arrays."}, // Synonym for call
            {"syntax", "The rules for writing code using 2D arrays (e.g., int[][] arr = ...)."},
            {"modify", "To change an element's value using the assignment operator with row and column indices."}, // Synonym for set
            {"assign", "To store a value in a 2D array element using the assignment operator."}, // Assignment
            {"bounds", "The limits of valid indices for rows and columns in a 2D array."}, // Array bounds
            {"column", "The vertical arrangement of elements in a 2D array."}, // Full word for col
            {"rowcol", "Refers to accessing an element by specifying its row and then its column."}, // Row and column access

            // --- Words of Length 7 ---
            {"private", "Access modifier often used for 2D array instance variables within a class."},
            {"boolean", "Primitive type, can be stored directly in a 2D boolean array."}, // 2D Array of booleans
            {"integer", "Wrapper class for int, but 2D arrays can store int primitives directly."}, // int[][] vs Integer[][]
            {"declare", "To specify the type and name of a 2D array variable."},
            {"outside", "Refers to code external to where a 2D array is declared or used."},
            {"initial", "The default value of elements when a 2D array is created (e.g., 0 for int, null for objects)."}, // Default initial values
            {"keyword", "Reserved words like 'new', 'int', 'public', 'private'."},
            {"compile", "To translate code using 2D arrays into bytecode."},
            {"execute", "To run a program that uses 2D arrays."},
            {"program", "A set of instructions, potentially using 2D arrays."},
            {"display", "To show the contents of a 2D array."}, // Synonym for print
            {"element", "An individual item stored at a specific row and column in a 2D array."},
            {"compare", "To check if two 2D arrays or elements are equal or have a relationship."}, // Comparing 2D arrays/elements
            {"literal", "A fixed value or sequence used to initialize a 2D array (e.g., {{1, 2}, {3, 4}})."}, // 2D Array literal
            {"indices", "The plural of index, used to specify both row and column."}, // Row and column indices

            // --- Words of Length 8 ---
            {"javadoc", "Documentation for Java code, including methods that use 2D arrays."}, // Javadoc comments
            {"outofbnd", "Short for Index Out Of Bounds, a common 2D array error."}, // Informal abbreviation
            {"allocate", "To reserve memory for a 2D array object using 'new'."},
            {"identity", "Refers to which specific 2D array object a reference points to."},
            {"retrieve", "To get an element from a 2D array using its indices."}, // Synonym for access/get
            {"traverse", "To visit each element in a 2D array, typically using nested loops."}, // 2D Array traversal
            {"subscript", "Another term for the index used to access array elements; 2D uses two."}, // Subscript operator [][]
            {"onedim", "Short for one-dimensional array; a 2D array is an array of these."}, // Informal abbreviation
            {"twodim", "Short for two-dimensional array."}, // Informal abbreviation
            {"rowmajor", "Order of processing elements in a 2D array by iterating through rows first."}, // Row-major traversal
            {"colmajor", "Order of processing elements in a 2D array by iterating through columns first."}, // Column-major traversal
            {"nestedlp", "Short for nested loop, used for 2D array traversal."}, // Informal abbreviation

            // --- Words of Length 9 ---
            {"exception", "An event that disrupts normal program flow, like ArrayIndexOutOfBoundsException."}, // Exceptions
            {"outofbnds", "Short for Index Out Of Bounds, a common 2D array error."}, // Informal abbreviation (alternative)
            {"reference", "A variable that stores the memory address of a 2D array object."},
            {"execution", "The process of running code that uses 2D arrays."},
            {"operation", "An action performed on a 2D array, like accessing or modifying elements."},
            {"instantiate", "To create a 2D array object using 'new'."}, // Synonym for create
            {"structure", "The organization of data within a 2D array (rows and columns)."}, // Data structure
            {"processor", "Code (like nested loops) that performs operations on 2D array elements."}, // 2D Array processor
            {"primitive", "Data types like int, boolean, double that can be stored directly in 2D arrays."}, // Primitive types
            {"rowindex", "The first index used to access an element in a 2D array."}, // Row index
            {"colindex", "The second index used to access an element in a 2D array."}, // Column index

            // --- Words of Length 10 ---
            {"definition", "The code that specifies the structure and behavior of your classes using 2D arrays."},
            {"accessible", "Describes 2D arrays or their elements that can be used based on scope and modifiers."},
            {"tostring", "Method often used to provide a string representation of a 2D array's contents (requires helper methods)."}, // toString() method (needs helper)
            {"processing", "Performing operations on elements within a 2D array, typically using nested loops."}, // Data processing
            {"dimensions", "Refers to the number of indices needed to access an element (two for 2D)."}, // Dimensions
            {"twodarray", "A common term for a two-dimensional array."}, // Synonym for 2D array
            {"arrayofarr", "Describes a 2D array as an array of arrays."}, // Array of arrays
            {"arrayindex", "The position used to access an element in an array; 2D uses two."}, // Synonym for index
            {"outofbounds", "Describes an index that is not valid for a 2D array, causing an error."} // Index out of bounds (full term)
        };


        english = new String[][]{
        	    // 2-3 letter words
        	    {"ox", "A domesticated bovine animal"},
        	    {"run", "To move swiftly on foot"},
        	    {"act", "A main division of a play"},
        	    {"pen", "A tool used for writing"},
        	    {"pun", "A play on words"},
        	    {"sim", "A simulation or similarity"},
        	    {"met", "Past tense of 'meet'"},

        	    // 4-letter words
        	    {"noun", "A person, place, thing, or idea"},
        	    {"verb", "A word that describes an action or state"},
        	    {"tone", "The author's attitude toward the subject"},
        	    {"plot", "The sequence of events in a story"},
        	    {"mood", "The emotional feeling of a piece"},
        	    {"edit", "To revise or correct a text"},
        	    {"poem", "A composition in verse"},
        	    {"rhyme", "A repetition of similar sounds"},

        	    // 5-letter words
        	    {"theme", "The main idea or message of a work"},
        	    {"irony", "A contrast between expectation and reality"},
        	    {"genre", "A category of literature or art"},
        	    {"prose", "Ordinary written language"},
        	    {"draft", "A preliminary version of a text"},
        	    {"title", "The name of a work"},
        	    {"clause", "A group of words with subject and verb"},
        	    {"quote", "A repetition of someone else's words"},
        	    {"intro", "The beginning section of a piece"},

        	    // 6-letter words
        	    {"simile", "A comparison using 'like' or 'as'"},
        	    {"symbol", "An object representing an idea"},
        	    {"author", "The writer of a literary work"},
        	    {"phrase", "A small group of words"},
        	    {"editor", "Someone who prepares text for publication"},
        	    {"speech", "A spoken presentation"},
        	    {"dialog", "A conversation in a story"},
        	    {"couplet", "Two lines of verse, often rhyming"},
        	    {"revise", "To improve a piece of writing"},
        	    {"thesis", "Main point in an essay"},

        	    // 7-letter words
        	    {"subject", "What the sentence is about"},
        	    {"summary", "A short version of a longer text"},
        	    {"fiction", "Imagined narrative writing"},
        	    {"imagery", "Descriptive language for the senses"},
        	    {"setting", "Time and place of a story"},
        	    {"context", "Circumstances surrounding a text"},
        	    {"villain", "The antagonist in a story"},
        	    {"grammar", "Rules of a language"},
        	    {"message", "The idea a writer communicates"},
        	    {"trigger", "A stimulus that sparks a response"},

        	    // 8-letter words
        	    {"sentence", "A complete thought with subject and verb"},
        	    {"conflict", "A struggle or problem in a story"},
        	    {"dialogue", "Spoken interaction in writing"},
        	    {"evidence", "Proof from the text"},
        	    {"audience", "Who the work is intended for"},
        	    {"analysis", "Detailed examination of a work"},
        	    {"allusion", "A reference to another work"},
        	    {"blueprint", "Detailed plan or structure"},
        	    {"parody", "Imitation for comic effect"},
        	    {"narrator", "The voice telling the story"},

        	    // 9-letter words
        	    {"predicate", "Part of sentence telling what subject does"},
        	    {"flashback", "Scene showing past events"},
        	    {"underline", "To emphasize text"},
        	    {"figurative", "Not literal; symbolic meaning"},
        	    {"resolution", "End or solution of a conflict"},
        	    {"antonym", "Word opposite in meaning"},
        	    {"syllable", "A single unit of sound in a word"},
        	    {"criticism", "Judgment or analysis of work"},
        	    {"character", "Person in a story"},
        	    {"structure", "The way a text is organized"},

        	    // 10-letter words
        	    {"adjective", "Word describing a noun"},
        	    {"hyperbole", "Exaggeration for effect"},
        	    {"foreshadow", "Hinting at future events"},
        	    {"conclusion", "The ending or final summary"},
        	    {"persuasive", "Trying to convince the reader"},
        	    {"comparison", "Identifying similarities"},
        	    {"expression", "A way of showing ideas or feelings"},
        	    {"narrative", "Story or account of events"},
        	    {"antagonist", "Character who opposes the protagonist"},
        	    {"connotative", "Implied meaning beyond the literal"}
        	};
    }
    
    public String[][] getUnitByName(String name) {
        switch (name.toLowerCase()) {
            case "unit_1":
                return unit_1;
            case "unit_2":
                return unit_2;
            case "unit_3":
                return unit_3;
            case "unit_4":
                return unit_4;
            case "unit_5":
                return unit_5;
            case "unit_6":
                return unit_6;
            case "unit_7":
                return unit_7;
            case "unit_8":
                return unit_8;
            case "english":
                return english;
            default:
                return new String[0][0];
        }
    }
    
    public ArrayList<String> getTermsByCategoriesAndLength(ArrayList<String> categories, int length) {
        ArrayList<String> results = new ArrayList<String>();

        for (int i = 0; i < categories.size(); i++) {
            String category = categories.get(i);
            String[][] selectedUnit = null;

            if (category.equals("unit_1")) selectedUnit = unit_1;
            if (category.equals("unit_2")) selectedUnit = unit_2;
            if (category.equals("unit_3")) selectedUnit = unit_3;
            if (category.equals("unit_4")) selectedUnit = unit_4;
            if (category.equals("unit_5")) selectedUnit = unit_5;
            if (category.equals("unit_6")) selectedUnit = unit_6;
            if (category.equals("unit_7")) selectedUnit = unit_7;
            if (category.equals("unit_8")) selectedUnit = unit_8;
            if (category.equals("usHistory")) selectedUnit = usHistory;
            if (category.equals("english")) selectedUnit = english;

            if (selectedUnit != null) {
                for (int j = 0; j < selectedUnit.length; j++) {
                    if (selectedUnit[j][0].length() == length) {
                        results.add(selectedUnit[j][0]);
                    }
                }
            }
        }

        return results;
    }
    
    public ArrayList<String> getCluesByCategoriesAndLength(ArrayList<String> categories, int length) {
        ArrayList<String> results = new ArrayList<String>();

        for (int i = 0; i < categories.size(); i++) {
            String category = categories.get(i);
            String[][] selectedUnit = null;

            if (category.equals("unit_1")) selectedUnit = unit_1;
            if (category.equals("unit_2")) selectedUnit = unit_2;
            if (category.equals("unit_3")) selectedUnit = unit_3;
            if (category.equals("unit_4")) selectedUnit = unit_4;
            if (category.equals("unit_5")) selectedUnit = unit_5;
            if (category.equals("unit_6")) selectedUnit = unit_6;
            if (category.equals("unit_7")) selectedUnit = unit_7;
            if (category.equals("unit_8")) selectedUnit = unit_8;
            if (category.equals("usHistory")) selectedUnit = usHistory;
            if (category.equals("english")) selectedUnit = english;

            if (selectedUnit != null) {
                for (int j = 0; j < selectedUnit.length; j++) {
                    if (selectedUnit[j][0].length() == length) {
                        results.add(selectedUnit[j][1]);
                    }
                }
            }
        }

        return results;
    }

}