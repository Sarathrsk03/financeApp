import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

interface ChatMessage {
  sender: 'user' | 'bot';
  message: string;
  id?: string;
  timestamp?: number;
}

interface ApiRequest {
  message: string;
  history: ChatMessage[];
}

interface ApiResponse {
  candidates: [{
    content: {
      parts: [{
        text: string;
      }];
      role: string;
    };
    finish_reason: number;
    index: number;
    safety_ratings: Array<{
      category: number;
      probability: number;
      blocked: boolean;
    }>;
    token_count: number;
    grounding_attributions: any[];
    avg_logprobs: number;
  }];
  usage_metadata: {
    prompt_token_count: number;
    candidates_token_count: number;
    total_token_count: number;
    cached_content_token_count: number;
  };
}

const API_URL = 'https://hcibackend.onrender.com/chat';

const MessageBubble = React.memo(({ message }: { message: ChatMessage }) => {
  const isBot = message.sender === 'bot';
  
  return (
    <View style={[
      styles.messageBubble,
      isBot ? styles.botBubble : styles.userBubble
    ]}>
      <Text style={[
        styles.messageText,
        isBot ? styles.botText : styles.userText
      ]}>
        {message.message}
      </Text>
      {message.timestamp && (
        <Text style={styles.timestamp}>
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </Text>
      )}
    </View>
  );
});

export default function ChatBot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = useCallback(async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      sender: 'user',
      message: inputText.trim(),
      id: Date.now().toString(),
      timestamp: Date.now(),
    };

    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const apiRequest: ApiRequest = {
        message: userMessage.message,
        history: messages.map(({ sender, message }) => ({
          sender,
          message,
        })),
      };

      console.log('Sending request:', JSON.stringify(apiRequest, null, 2));

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(apiRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      console.log('Received response:', JSON.stringify(data, null, 2));

      // Check if we have a valid response with text
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from server');
      }

      const botMessage: ChatMessage = {
        sender: 'bot',
        message: data.candidates[0].content.parts[0].text.trim(),
        id: (Date.now() + 1).toString(),
        timestamp: Date.now(),
      };

      setMessages(prevMessages => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: ChatMessage = {
        sender: 'bot',
        message: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        id: (Date.now() + 1).toString(),
        timestamp: Date.now(),
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, messages, isLoading]);

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  // Initialize with welcome message
  React.useEffect(() => {
    const welcomeMessage: ChatMessage = {
      sender: 'bot',
      message: 'How can I help you today? I can answer finance-related questions. For example, you can ask me about stock prices, company specific news, or historical financial data.',
      id: 'welcome',
      timestamp: Date.now(),
    };
    setMessages([welcomeMessage]);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 90}
      >
        <View style={styles.header}>
          <Text style={styles.headerText}>Finance Assistant</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item }) => <MessageBubble message={item} />}
          keyExtractor={item => item.id || item.message}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToBottom}
          onLayout={scrollToBottom}
        />

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me about finance..."
            placeholderTextColor="#666"
            multiline
            maxLength={1000}
            onSubmitEditing={sendMessage}
            editable={!isLoading}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled
            ]} 
            onPress={sendMessage}
            disabled={isLoading || !inputText.trim()}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons 
                name="send" 
                size={24} 
                color={inputText.trim() ? '#fff' : '#A0A0A0'} 
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Platform.OS === 'ios' ? Constants.statusBarHeight : 16,
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 32,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  userBubble: {
    backgroundColor: '#007AFF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: '#E8E8E8',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: '#fff',
  },
  botText: {
    color: '#000',
  },
  timestamp: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F8F8F8',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
});