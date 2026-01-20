import { Feather } from '@expo/vector-icons';
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import ColorfulBubblesBG from './ColorfulBubblesBG';
import productsData from './products.json';

const { width, height } = Dimensions.get('window');

// Remove static bot responses. We'll use Groq API instead.

const initialOptions = [
  'Hair Care',
  'Skin Care',
  'Oral Care'
];

type Message = {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  isProductMessage?: boolean;
  products?: any[];
};

// Products data is now imported from products.json

// Category mapping with keywords
const categoryMap = {
  'Hair Care': ['hair', 'shampoo', 'oil', 'mask', 'keratin', 'minoxidil', 'booster'],
  'Skin Care': ['skin', 'face', 'ubtan', 'serum', 'acne', 'anti-aging', 'anti aging', 'gift pack', 'noor jahan'],
  'Oral Care': ['oral', 'mouth', 'teeth', 'immune', 'wow immune']
};

// Fallback Q&A responses used when the API fails or returns no answer
const fallbackResponses: { triggers: string[]; response: string }[] = [
  { triggers: ['hi', 'hello', 'hey', 'salaam', 'assalam'], response: 'Hello! Welcome to Pakeeza Products. How can I help you today? You can browse categories or ask about a product.' },
  { triggers: ['price', 'how much', 'cost', 'price of'], response: 'You can check product prices by asking for a category like "Hair Care" or visit: https://pakeezaproducts.store' },
  { triggers: ['products', 'what do you have', 'catalog', 'show products'], response: 'We offer Hair Care, Skin Care, Anti-Aging, Serums and more. Choose a category above to see products.' },
  { triggers: ['order', 'buy', 'purchase'], response: 'To purchase, open the product link after selecting a category or visit: https://pakeezaproducts.store' },
  { triggers: ['contact', 'support', 'help', 'address', 'email', 'phone', 'call'], response: '📍 Address: G-15 Ground Floor, Heaven Mall Zarrar Shaheed Road Lahore Cantt.\n📞 Call: 03006333999\n✉️ Email: info@pakeezaproducts.store' },
  { triggers: ['thanks', 'thank you', 'thx'], response: "You're welcome! Explore our Hair Care, Skin Care, and Oral Care collections." },
  { triggers: ['bye', 'goodbye', 'see you'], response: 'Goodbye! Feel free to come back if you need more help.' },
  { triggers: ['what can you do', 'help me', 'default'], response: 'I can help you find products. Try selecting a category like "Skin Care" or ask "show me serums".' },
];

const getFallbackResponse = (userText: string) => {
  if (!userText) return 'Sorry, I\'m having trouble reaching the assistant right now. Meanwhile, you can browse categories or visit: https://pakeezaproducts.store';
  const lower = userText.toLowerCase();
  for (const item of fallbackResponses) {
    if (item.triggers.some(t => lower.includes(t))) {
      return item.response;
    }
  }
  return 'Sorry, I\'m having trouble reaching the assistant right now. Meanwhile, you can browse categories or visit: https://pakeezaproducts.store';
};

const ChatBot = () => {
  // Helper: Find all products for a category
  const getProductsForCategory = (category: string) => {
    const lowerCategory = category.toLowerCase();

    // Find matching category from map
    let matchedCategory = '';
    for (const [cat, keywords] of Object.entries(categoryMap)) {
      if (keywords.some(keyword => lowerCategory.includes(keyword)) ||
        lowerCategory.includes(cat.toLowerCase())) {
        matchedCategory = cat;
        break;
      }
    }

    if (!matchedCategory) {
      // Try to match with initial options
      const matchedOption = initialOptions.find(option =>
        lowerCategory.includes(option.toLowerCase())
      );
      if (matchedOption) {
        matchedCategory = matchedOption;
      }
    }

    // Filter products by category
    const filteredProducts = productsData.filter(product =>
      product.category.toLowerCase().includes(lowerCategory) ||
      lowerCategory.includes(product.category.toLowerCase()) ||
      (matchedCategory && product.category === matchedCategory)
    );

    return filteredProducts;
  };

  // Remove welcome message from chat messages
  // Add welcome message as the first message
  const [messages, setMessages] = useState<Message[]>([{
    id: 'welcome',
    text: 'Hello! Welcome to Pakeeza Products! How can I assist you today?',
    sender: 'bot',
  }]);
  const [inputText, setInputText] = useState('');
  const [showOptions, setShowOptions] = useState(true);

  useEffect(() => {
    if (showOptions) {
      optionAnimations.forEach(anim => anim.setValue(1));
    }
  }, [showOptions]);

  const [userHasSentMessage, setUserHasSentMessage] = useState(false);
  const flatListRef = useRef<FlatList<any>>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const optionsAnim = useRef(new Animated.Value(0)).current;

  const [isBotThinking, setIsBotThinking] = useState(false);
  const [fullChatHistory, setFullChatHistory] = useState<any[]>([]);
  const thinkingAnim = useRef(new Animated.Value(0)).current;
  const optionAnimations = useRef(initialOptions.map(() => new Animated.Value(0))).current;

  // Keyboard offset for moving the input above the keyboard on mobile
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    ]).start(() => {
      if (showOptions) {
        animateOptions();
      }
    });
  }, []);

  // Auto-scroll to end on new message
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current && flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Listen for keyboard show/hide events and update bottom offset
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      const height = e.endCoordinates?.height || 0;
      setKeyboardOffset(height);
      // Scroll to end so latest message + input are visible
      setTimeout(() => {
        flatListRef.current && flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardOffset(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const animateOptions = () => {
    const animations = optionAnimations.map((anim, index) => {
      return Animated.timing(anim, {
        toValue: 1,
        duration: 400,
        delay: index * 100,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad)
      });
    });

    Animated.stagger(100, animations).start();
  };

  const startThinkingAnimation = () => {
    setIsBotThinking(true);
    Animated.loop(
      Animated.sequence([
        Animated.timing(thinkingAnim, {
          toValue: 1,
          duration: 500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(thinkingAnim, {
          toValue: 0,
          duration: 500,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const stopThinkingAnimation = () => {
    thinkingAnim.stopAnimation();
    setIsBotThinking(false);
    thinkingAnim.setValue(0);
  };

  const startNewChat = () => {
    // Fade out animation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      // Save current messages to full history for context
      setFullChatHistory(prev => [
        ...prev,
        ...messages.map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }))
      ]);

      // Reset visual messages
      setMessages([{
        id: 'welcome-' + Date.now(),
        text: 'Hello! I\'ve started a fresh session for you. I still remember our previous conversation if you need anything related to it. How can I help you now?',
        sender: 'bot',
      }]);

      setInputText('');
      setShowOptions(true);
      setUserHasSentMessage(false);

      // Animate options back in
      optionAnimations.forEach(anim => anim.setValue(0));
      animateOptions();

      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleSend = async (customText?: string) => {
    const textToSend = typeof customText === 'string' ? customText : inputText;
    if (textToSend.trim() === '') return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: textToSend,
      sender: 'user'
    };

    setMessages(prevMessages => {
      const updated: Message[] = [...prevMessages, newUserMessage];
      return updated;
    });
    setInputText('');
    setShowOptions(false);
    setUserHasSentMessage(true);

    setTimeout(() => {
      if (flatListRef.current) {
        flatListRef.current.scrollToEnd({ animated: true });
      }
    }, 100);

    startThinkingAnimation();

    const isExplicitCategoryClick = typeof customText === 'string' && initialOptions.includes(customText);

    if (isExplicitCategoryClick) {
      const matchedProducts = getProductsForCategory(textToSend);
      if (matchedProducts.length > 0) {
        stopThinkingAnimation();
        const sortedProducts = matchedProducts.sort((a, b) => {
          const priceA = parseFloat((a.discountedPrice || a.price || '0').replace(/[^\d.]/g, ''));
          const priceB = parseFloat((b.discountedPrice || b.price || '0').replace(/[^\d.]/g, ''));
          return priceA - priceB;
        });

        const newBotMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `I found ${sortedProducts.length} premium products in the ${textToSend} category for you:`,
          sender: 'bot',
          isProductMessage: true,
          products: sortedProducts
        };
        setMessages(prevMessages => [...prevMessages, newBotMessage]);
        return;
      }
    }

    // For typed messages or other inquiries - use AI
    const productKeywords = ['product', 'buy', 'shop', 'price', 'kit', 'bundle', 'cream', 'serum', 'oil', 'wash', 'treat', 'care', 'mask', 'shampoo'];
    const isProductInquiry = productKeywords.some(k => textToSend.toLowerCase().includes(k));

    // No early return for inquiries - always go to AI to handle conversationally

    // Call Groq API for other queries
    try {
      const apiKey = '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';

      const response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
          messages: [
            {
              role: 'system',
              content: `You are the Premium Assistant for Pakeeza Products.
              
              GOAL: BE SHORT, FAST, AND DIRECT.
              
              INSTRUCTIONS:
              1. IF user mentions an issue (e.g., "Acne", "Hair fall", "Whitening"), IMMEDIATELY recommend 2-3 matching products from the catalog. DO NOT ask long follow-up questions.
              2. IF specific product explicitly requested is NOT in catalog, simply say: "Currently out of stock here. Please visit https://pakeezaproducts.store".
              3. IF user says generic category ("Skin care"), ask a SHORT 3-4 word clarification (e.g., "For Acne, Glow, or Anti-aging?").
              4. RECOMMENDATION FORMAT: Product Name - Price. (Keep it brief).
              
              CATALOG: ${JSON.stringify(productsData)}`
            },
            ...fullChatHistory,
            ...messages.map(m => ({
              role: m.sender === 'user' ? 'user' : 'assistant',
              content: m.text
            })),
            { role: 'user', content: textToSend }
          ],
          max_tokens: 256,
          temperature: 0.6,
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 10000,
        }
      );

      stopThinkingAnimation();
      let botText = response.data.choices?.[0]?.message?.content?.trim() || '';

      // If API returned nothing meaningful, use a friendly fallback response
      if (!botText) {
        botText = getFallbackResponse(textToSend);
      } else {
        // Add suggestion to browse categories or visit website if it's a product inquiry
        const lowerBot = botText.toLowerCase();
        if (isProductInquiry && !lowerBot.includes('pakeezaproducts.store')) {
          botText += '\n\nYou can also browse our full collection at: https://pakeezaproducts.store';
        } else if (!lowerBot.includes('category') && !lowerBot.includes('product')) {
          botText += '\n\nYou can browse our product categories above or visit: https://pakeezaproducts.store';
        }
      }

      const newBotMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botText,
        sender: 'bot'
      };
      setMessages(prevMessages => [...prevMessages, newBotMessage]);
    } catch (error) {
      stopThinkingAnimation();
      console.error('Groq API error:', error);
      const fallback = getFallbackResponse(textToSend);
      const newBotMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: fallback,
        sender: 'bot'
      };
      setMessages(prevMessages => [...prevMessages, newBotMessage]);
    }
  };

  const renderProductMessage = (products: any[]) => {
    // Dynamic tip based on category or title
    let tip = 'Here are some products you might like!';
    if (products && products.length > 0) {
      const cat = products[0].category ? products[0].category.toLowerCase() : '';
      if (cat.includes('hair')) {
        tip = 'Tip: For strong, healthy hair, our 18 Herbs collection is highly recommended.';
      } else if (cat.includes('skin')) {
        tip = 'Tip: For glowing results, combine our face wash with a specialized serum.';
      } else if (cat.includes('oral') || cat.includes('mouth')) {
        tip = 'Tip: Our mouth solutions are designed for complete oral hygiene.';
      } else {
        tip = `Explore these premium options from our ${products[0].category} collection!`;
      }
    }
    return (
      <View style={[styles.messageContainer, styles.botMessageContainer]}>
        <Image source={require('../assets/images/icon.jpg')} style={styles.botAvatar} />
        <View style={[styles.messageBubble, styles.botBubble, { flex: 1 }]}>
          {/* Chatbot helpful tip above product list */}
          <Text style={styles.botMessageText}>{tip}</Text>
          <ScrollView
            style={[styles.productsScrollView, { maxHeight: 300 }]}
            contentContainerStyle={{ paddingBottom: 10 }}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {products.map((product, index) => (
              <View key={index} style={{ marginBottom: 12 }}>
                <Text style={styles.productTitle}>{product.title}</Text>
                <Text style={styles.priceContainer}>
                  {product.discountedPrice && product.discountedPrice !== product.price ? (
                    <>
                      <Text style={styles.discountedPrice}>{product.discountedPrice} </Text>
                      <Text style={styles.originalPrice}>{product.price}</Text>
                    </>
                  ) : (
                    <Text style={styles.discountedPrice}>{product.price}</Text>
                  )}
                </Text>
                <Text
                  style={styles.linkTextChat}
                  onPress={() => Linking.openURL(product.link)}
                >
                  {product.link}
                </Text>
                {index < products.length - 1 && <View style={styles.productSeparator} />}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    // Render product message
    if (!isUser && item.isProductMessage && item.products) {
      return renderProductMessage(item.products);
    }

    // Helper: find URLs in text
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = item.text.split(urlRegex);

    return (
      <View
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.botMessageContainer,
        ]}
      >
        {!isUser && (
          <Image
            source={require('../assets/images/icon.jpg')}
            style={styles.botAvatar}
          />
        )}
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.botBubble
        ]}>
          <Text style={isUser ? styles.userMessageText : styles.botMessageText}>
            {parts.map((part, idx) => {
              if (urlRegex.test(part)) {
                return (
                  <Text
                    key={idx}
                    style={styles.linkTextChat}
                    onPress={() => Linking.openURL(part)}
                  >
                    {part}
                  </Text>
                );
              }
              return part;
            })}
          </Text>
        </View>
        {isUser && (
          <Image
            source={require('../assets/images/icon.jpg')}
            style={styles.userAvatar}
          />
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { flex: 1 }]}>
      <ColorfulBubblesBG />
      {/* Header */}
      <Animated.View
        style={[styles.header, {
          opacity: headerAnim,
          transform: [{
            translateY: headerAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-100, 0]
            })
          }]
        }]}
      >
        <View style={styles.headerContent}>
          <Image
            source={require('../assets/images/icon.jpg')}
            style={styles.logo}
          />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Pakeeza Products</Text>
            <View style={styles.statusContainer}>
              <View style={styles.statusIndicator} />
              <Text style={styles.statusText}>Online</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={startNewChat}
            accessibilityLabel="Start new chat"
          >
            <Feather name="plus-circle" size={26} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setShowOptions((prev) => !prev)}
            accessibilityLabel="Show categories"
          >
            <Feather name="grid" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Chat messages */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.messagesList,
            { paddingBottom: keyboardOffset ? keyboardOffset + 240 : 220 }
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          onContentSizeChange={() => {
            if (flatListRef.current && messages.length > 0) {
              flatListRef.current.scrollToEnd({ animated: true });
            }
          }}
        />
      </Animated.View>

      {/* Category list (Moved above input and improved layout) */}
      {showOptions && (
        <View style={[styles.optionsContainer, { bottom: keyboardOffset ? keyboardOffset + 120 : 100 }]}>
          <View style={styles.optionsHeader}>
            <Text style={styles.optionsTitle}>Fast Selection</Text>
            <TouchableOpacity onPress={() => setShowOptions(false)}>
              <Feather name="x" size={20} color="#7D7463" />
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.optionsScrollContainer}
          >
            {initialOptions.map((item, index) => (
              <TouchableOpacity
                key={item}
                style={styles.optionButton}
                onPress={() => handleSend(item)}
              >
                <Text style={styles.optionButtonText}>{item}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Bot thinking animation */}
      {isBotThinking && (
        <Animated.View
          style={[styles.thinkingContainer, { opacity: thinkingAnim }]}
        >
          <Image
            source={require('../assets/images/icon.jpg')}
            style={styles.botAvatar}
          />
          <View style={styles.thinkingBubble}>
            <Text style={styles.thinkingText}>Thinking</Text>
            <Animated.View style={styles.thinkingDots}>
              <Animated.View style={[styles.dot, {
                opacity: thinkingAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 1, 0.3]
                })
              }]} />
              <Animated.View style={[styles.dot, {
                opacity: thinkingAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 1, 0.3]
                })
              }]} />
              <Animated.View style={[styles.dot, {
                opacity: thinkingAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 1, 0.3]
                })
              }]} />
            </Animated.View>
          </View>
        </Animated.View>
      )}

      {/* Input box */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 60}
        style={[styles.inputContainer, { bottom: keyboardOffset ? keyboardOffset + 40 : 20 }]}
      >
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            multiline
            onFocus={() => {
              setTimeout(() => {
                flatListRef.current && flatListRef.current.scrollToEnd({ animated: true });
              }, 100);
            }}
          />
          <TouchableOpacity
            style={[styles.sendButton, !inputText && styles.sendButtonDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText}
          >
            <Feather name="send" size={22} color="#fff" style={styles.sendIcon} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    backgroundColor: '#0F172A',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: 15,
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerTextContainer: {
    flex: 1,
    paddingTop: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  headerIconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
  },
  welcomeContainer: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 18,
    margin: 10,
    marginBottom: 0,
  },
  welcomeText: {
    fontSize: 17,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  optionsContainer: {
    position: 'absolute',
    left: 15,
    right: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 24,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    zIndex: 100,
  },
  optionsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  optionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3E3A36',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionsScrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 5,
  },
  optionButton: {
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionButtonText: {
    color: '#1E293B',
    fontWeight: '600',
    fontSize: 13,
  },
  messagesList: {
    padding: 15,
    paddingTop: 25,
    paddingBottom: 10,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  botMessageContainer: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 15,
    borderRadius: 22,
    marginHorizontal: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userBubble: {
    backgroundColor: '#3B82F6',
    borderBottomRightRadius: 4,
    elevation: 4,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  botBubble: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  userMessageText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500',
  },
  botMessageText: {
    color: '#1E293B',
    fontSize: 16,
    lineHeight: 24,
  },
  botAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#EAE6DD',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#D8E6F3',
  },
  productsScrollView: {
    maxHeight: 300,
    minHeight: 100,
  },
  productItem: {
    paddingVertical: 0,
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#5D5340',
    marginBottom: 2,
  },
  priceContainer: {
    fontSize: 14,
    color: '#388e3c',
    marginBottom: 2,
  },
  discountedPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#388e3c',
  },
  originalPrice: {
    fontSize: 13,
    color: '#888',
    textDecorationLine: 'line-through',
  },
  linkTextChat: {
    color: '#1a0dab',
    textDecorationLine: 'underline',
    fontSize: 13,
    marginTop: 2,
    marginBottom: 2,
  },
  productSeparator: {
    height: 1,
    backgroundColor: '#EAE6DD',
    marginVertical: 10,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  thinkingBubble: {
    backgroundColor: '#F4EFE8',
    padding: 15,
    borderRadius: 22,
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  thinkingText: {
    color: '#7D7463',
    marginRight: 8,
    fontWeight: '500',
  },
  thinkingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#7D7463',
    marginHorizontal: 2,
  },
  inputContainer: {
    position: 'absolute',
    left: 15,
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 0,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#F4EFE8',
    borderRadius: 16,
    color: '#333',
  },
  sendButton: {
    backgroundColor: '#388e3c',
    padding: 6,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
    width: 32,
    height: 32,
  },
  sendButtonDisabled: {
    backgroundColor: '#bdbdbd',
  },
  sendIcon: {
    width: 18,
    height: 18,
    tintColor: '#fff',
  },
});

export default ChatBot;