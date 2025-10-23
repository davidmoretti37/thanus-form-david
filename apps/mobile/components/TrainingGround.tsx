// 1. IMPORTS - Bring in code from other files
import React, { useState } from 'react';  // React library + useState hook for changing data
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';  // UI components
import { useTheme } from '@/hooks/useThemeColor';  // Custom hook to get app colors
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, X } from 'lucide-react-native';  // Icon library

// 2. INTERFACE - Define what data this component expects to receive
interface TrainingGroundProps {
  onBack: () => void;  // Function that gets called when user wants to go back
}

// 3. COMPONENT FUNCTION - The main function that creates our UI
export const TrainingGround: React.FC<TrainingGroundProps> = ({ onBack }) => {
  // 4. HOOKS - Get data and state management
  const theme = useTheme();  // Get all the app's colors (dark/light mode)
  
  // 5. STATE VARIABLES - Data that can change and will update the UI
  const [message, setMessage] = useState('Hello Training Ground!');  // Text that can change
  const [counter, setCounter] = useState(50000);  // Number that can increase/decrease
  const [isVisible, setIsVisible] = useState(true);  // Boolean for showing/hiding things

  const handleReset = () => {
    setCounter(0);
    setMessage('Reset!');
    console.log('Everything was reset!');
  };
  
  const handleDouble = () => {
    setCounter(counter * 2);
    console.log('Counter doubled!');
  };
  
  const handleRandom = () => {
    const randomNumber = Math.floor(Math.random() * 1000);
    setCounter(randomNumber);
    console.log('Random number:', randomNumber);
  };
  // 6. STYLES - Define how everything should look
  const styles = StyleSheet.create({
    container: {
      position: 'absolute',  // Cover the entire screen
      top: 0,               // Start at the very top
      left: 0,              // Start at the very left
      right: 0,             // Go to the very right
      bottom: 0,            // Go to the very bottom
      backgroundColor: theme.background,  // Use app's background color
      zIndex: 1000,         // Make sure it appears above everything else
    },
    header: {
      flexDirection: 'row',           // Arrange items horizontally
      justifyContent: 'flex-start', // Put title on left, button on right
      alignItems: 'center',           // Center items vertically
      paddingHorizontal: 40,          // Space on left and right
      paddingVertical: 30,            // Space on top and bottom
      borderBottomWidth: 5,           // Line under the header
      borderBottomColor: theme.border, // Color of the line
    },
    headerTitle: {
      fontSize: 16,           // Size of the text
      fontWeight: '600',      // How bold the text is
      color: theme.foreground, // Color of the text
    },
    closeButton: {
      width: 32,              // Width of the button
      height: 32,             // Height of the button
      borderRadius: 16,       // Make it round
      backgroundColor: theme.mutedWithOpacity(0.1), // Light background
      alignItems: 'center',   // Center the icon horizontally
      justifyContent: 'center', // Center the icon vertically
    },
    content: {
      flex: 1,                // Take up all remaining space
      padding: 20,            // Space around the content
    },
  });

  // 7. RETURN - The UI that users see (like HTML but in JavaScript)
  return (
    <View style={styles.container}>  {/* Main container covering whole screen */}
      <SafeAreaView style={{ flex: 1 }}>  {/* Respects phone notches and status bars */}
        
        {/* HEADER SECTION - Title and close button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Tars</Text>  {/* Page title */}
          <TouchableOpacity style={styles.closeButton} onPress={onBack}>  {/* Close button */}
            <ArrowLeft size={20} color={theme.foreground} />  {/* X icon */}
          </TouchableOpacity>
        </View>

        {/* CONTENT SECTION - Where you add your interactive elements */}
        <View style={styles.content}>
          
          {/* DISPLAYING VARIABLES - Show the current values */}
          <Text>{message}</Text>  {/* Display the message variable */}
          <Text>{counter}</Text>  {/* Display the counter variable */}
          <Text>{isVisible ? 'Visible' : 'Invisible'}</Text>  {/* Conditional text based on isVisible */}

          {/* NEW: FUNCTION BUTTONS */}
          <TouchableOpacity onPress={handleReset}>
            <Text>Reset Everything</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleDouble}>
            <Text>Double Counter</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleRandom}>
            <Text>Random Number</Text>
          </TouchableOpacity>

          {/* NEW: COUNTER CONTROLS - Buttons to change the counter */}
          <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
            <TouchableOpacity onPress={() => setCounter(counter - 1)}>
              <Text style={{ backgroundColor: 'red', padding: 10, color: 'white' }}>-</Text>
            </TouchableOpacity>
            
            <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{counter}</Text>
            
            <TouchableOpacity onPress={() => setCounter(counter + 1)}>
              <Text style={{ backgroundColor: 'blue', padding: 10, color: 'white' }}>+</Text>
            </TouchableOpacity>
          </View>

          {/* INTERACTIVE BUTTONS - Buttons that change the state when pressed */}
          <TouchableOpacity onPress={() => setMessage('Hello Training Ground! New message')}>
            <Text>Set Message</Text>  {/* Button to change the message */}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setCounter(counter + 1)}>
            <Text>Increment Counter</Text>  {/* Button to increase counter by 1 */}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsVisible(!isVisible)}>
            <Text>Toggle Visibility</Text>  {/* Button to flip true/false */}
          </TouchableOpacity>

        </View>
      </SafeAreaView>
    </View>
  );
};
