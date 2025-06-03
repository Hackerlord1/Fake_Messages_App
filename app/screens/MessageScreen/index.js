import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeContext, useTheme } from "../ThemeContext/ThemeContext";

// Initial messages array
const initialMessages = [
  { id: "1", sender: "TVWerty", message: "ch-Your Tinter code 28376...", time: "15:31" },
  { id: "2", sender: "M-PESA", message: "TFTZMLCJ.Confirmed.Ksh0.0...", time: "14:44" },
  { id: "3", sender: "Safaricom", message: "You have awarded 2 Bonga...", time: "14:29" },
  { id: "4", sender: "Maggie", message: "MrMrnh...", time: "10:21" },
  { id: "5", sender: "SAF Balance", message: "Dear customer: your Data Bundle...", time: "09:23" },
  { id: "6", sender: "CoopBank", message: "Dear HEMAN CHIRCHIR you ha...", time: "08:36" },
  { id: "7", sender: "Airtel", message: "Dear customer you have succ...", time: "Set" },
  { id: "8", sender: "Trizah", message: "call me thank...", time: "Sun" },
  { id: "9", sender: "New", message: "Hello", time: "Sun" },
];

// Array of colors for message icons
const iconColors = ["#FF69B4", "#FFD700", "#FFA500"]; // Pink, Yellow, Orange

const MessageScreen = () => {
  const navigation = useNavigation();
  const { isDarkMode, toggleTheme, colors: themeColors } = useTheme();
  const [messages, setMessages] = useState(initialMessages);
  const [showModal, setShowModal] = useState(false);
  const [senderInput, setSenderInput] = useState("");
  const [messageInput, setMessageInput] = useState("Hello");
  const [showEditTimeModal, setShowEditTimeModal] = useState(false);
  const [editTimeInput, setEditTimeInput] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  // Load latest messages from AsyncStorage on mount
  useEffect(() => {
    const loadLatestMessages = async () => {
      try {
        const updatedMessages = await Promise.all(
          messages.map(async (msg) => {
            const convo = await AsyncStorage.getItem(`conversation_${msg.sender}`);
            if (convo) {
              const conversation = JSON.parse(convo);
              const latestMessage = conversation[conversation.length - 1];
              if (latestMessage) {
                return {
                  ...msg,
                  message: latestMessage.text,
                  time: latestMessage.timestamp,
                };
              }
            }
            return msg;
          })
        );
        setMessages(updatedMessages);
      } catch (error) {
        console.error("Error loading latest messages:", error);
      }
    };
    loadLatestMessages();
  }, []);

  // Format and validate time (e.g., "14:50")
  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    if (!/^(?:[0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr)) return "";
    const [hours, minutes] = timeStr.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours > 23 || minutes > 59) return "";
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const handleStartChat = async () => {
    if (!senderInput.trim() || !messageInput.trim()) {
      Alert.alert("Error", "Please enter both a sender name and a message.");
      return;
    }
    if (messages.some((msg) => msg.sender === senderInput.trim())) {
      Alert.alert("Error", "Sender name already exists.");
      return;
    }

    const formattedTime = formatTime(
      new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })
    );

    const newMessage = {
      id: (messages.length + 1).toString(),
      sender: senderInput.trim(),
      message: messageInput.trim(),
      time: formattedTime,
    };

    setMessages([newMessage, ...messages]);

    try {
      const newConvoMessage = {
        id: Date.now().toString(),
        text: messageInput.trim(),
        timestamp: formattedTime,
        date: null,
        ref: `REF${Math.floor(Math.random() * 1000000)}`,
        isNew: true,
      };
      await AsyncStorage.setItem(
        `conversation_${newMessage.sender}`,
        JSON.stringify([newConvoMessage])
      );
    } catch (error) {
      console.error("Error saving new conversation:", error);
      Alert.alert("Error", "Failed to save conversation");
    }

    navigation.navigate("Conversation", { sender: newMessage.sender });
    setSenderInput("");
    setMessageInput("");
    setShowModal(false);
  };

  const handleEditTime = (id) => {
    const message = messages.find((msg) => msg.id === id);
    if (message) {
      setEditTimeInput(message.time);
      setEditingMessageId(id);
      setShowEditTimeModal(true);
    }
  };

  const handleSaveEditedTime = async () => {
    if (!editTimeInput.trim()) {
      Alert.alert("Error", "Please enter a valid time.");
      return;
    }

    const formattedTime = formatTime(editTimeInput);
    if (!formattedTime) {
      Alert.alert("Error", "Invalid time format. Use HH:MM (e.g., 14:50).");
      return;
    }

    try {
      const updatedMessages = messages.map((msg) =>
        msg.id === editingMessageId ? { ...msg, time: formattedTime } : msg
      );
      setMessages(updatedMessages);

      const sender = messages.find((msg) => msg.id === editingMessageId).sender;
      const convo = await AsyncStorage.getItem(`conversation_${sender}`);
      if (convo) {
        const conversation = JSON.parse(convo);
        const updatedConvo = conversation.map((msg, index) =>
          index === conversation.length - 1 ? { ...msg, timestamp: formattedTime } : msg
        );
        await AsyncStorage.setItem(`conversation_${sender}`, JSON.stringify(updatedConvo));
      }
    } catch (error) {
      console.error("Error updating time:", error);
      Alert.alert("Error", "Failed to update time");
    }

    setEditTimeInput("");
    setEditingMessageId(null);
    setShowEditTimeModal(false);
  };

  const handleDeleteMessage = (id) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this conversation?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedMessages = messages.filter((msg) => msg.id !== id);
              setMessages(updatedMessages);

              const sender = messages.find((msg) => msg.id === id).sender;
              await AsyncStorage.removeItem(`conversation_${sender}`);
            } catch (error) {
              console.error("Error deleting message:", error);
              Alert.alert("Error", "Failed to delete conversation");
            }
          },
        },
      ]
    );
  };

  const handleLongPress = (id) => {
    Alert.alert(
      "Message Options",
      "Choose an action",
      [
        {
          text: "Edit Time",
          onPress: () => handleEditTime(id),
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => handleDeleteMessage(id),
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ]
    );
  };

  const handleProfileOption = (action) => {
    setShowProfileDropdown(false);
    switch (action) {
      case "profile":
        Alert.alert("Profile", "Profile settings coming soon!");
        break;
      case "settings":
        Alert.alert("Settings", "App settings coming soon!");
        break;
      case "theme":
        toggleTheme();
        break;
      case "logout":
        Alert.alert("Logout", "You have been logged out!");
        break;
      default:
        break;
    }
  };

  const renderItem = ({ item, index }) => {
    const firstLetter = item.sender.charAt(0).toUpperCase();
    const iconColor = iconColors[index % iconColors.length];

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate("Conversation", { sender: item.sender })}
        onLongPress={() => handleLongPress(item.id)}
        activeOpacity={0.7}
        style={[styles.messageContainer, { backgroundColor: themeColors.card }]}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor }]}>
          <Text style={styles.iconText}>{firstLetter}</Text>
        </View>
        <View style={styles.messageContent}>
          <Text style={[styles.sender, { color: themeColors.text }]}>
            {item.sender}
          </Text>
          <Text
            style={[styles.message, { color: isDarkMode ? "#CCCCCC" : "#555555" }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.message}
          </Text>
        </View>
        <Text style={[styles.time, { color: isDarkMode ? "#AAAAAA" : "#888888" }]}>
          {item.time}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={themeColors.card}
      />
      <View style={[styles.header, { backgroundColor: themeColors.card }]}>
        <Image
          source={{ uri: "https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_92x30dp.png" }}
          style={styles.headerIcon1}
          resizeMode="contain"
        />
        <Text style={[styles.headerText, { color: themeColors.text }]}>
          Messages
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => Alert.alert("Search", "Search functionality coming soon!")}
            accessibilityLabel="Search messages"
          >
            <Image
              source={{ uri: "https://img.icons8.com/ios-filled/50/ffffff/search.png" }}
              style={[styles.headerIcon2, { tintColor: isDarkMode ? "#FFFFFF" : "#000000" }]}
              resizeMode="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setShowProfileDropdown(!showProfileDropdown)}
            accessibilityLabel="Profile menu"
          >
            <Image
              source={{ uri: "https://img.icons8.com/ios-filled/50/ffffff/user-male-circle.png" }}
              style={[styles.headerIcon3, { tintColor: isDarkMode ? "#FFFFFF" : "#000000" }]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Dropdown */}
      {showProfileDropdown && (
        <View style={[styles.dropdown, { backgroundColor: themeColors.card }]}>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => handleProfileOption("profile")}
          >
            <Text style={[styles.dropdownText, { color: themeColors.text }]}>Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => handleProfileOption("settings")}
          >
            <Text style={[styles.dropdownText, { color: themeColors.text }]}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => handleProfileOption("theme")}
          >
            <Text style={[styles.dropdownText, { color: themeColors.text }]}>
              {isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => handleProfileOption("logout")}
          >
            <Text style={[styles.dropdownText, { color: themeColors.text }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
      <TouchableOpacity
        style={[styles.chatButton, { backgroundColor: isDarkMode ? "#0077B6" : "#1DA1F2" }]}
        onPress={() => setShowModal(true)}
      >
        <Text style={styles.chatButtonText}>Start Chat</Text>
      </TouchableOpacity>

      {/* Modal for starting a new chat */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowModal(false);
          setSenderInput("");
          setMessageInput("");
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.modalContainer, { backgroundColor: isDarkMode ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)" }]}
        >
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                Start New Chat
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowModal(false);
                  setSenderInput("");
                  setMessageInput("");
                }}
              >
                <Text style={[styles.closeButton, { color: themeColors.text }]}>
                  X
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.modalInput, {
                borderColor: themeColors.border,
                color: themeColors.text,
                backgroundColor: themeColors.card,
              }]}
              value={senderInput}
              onChangeText={setSenderInput}
              placeholder="Enter sender name"
              placeholderTextColor={isDarkMode ? "#AAAAAA" : "#888888"}
              autoFocus
            />
            <TextInput
              style={[styles.modalInput, {
                minHeight: 100,
                borderColor: themeColors.border,
                color: themeColors.text,
                backgroundColor: themeColors.card,
              }]}
              value={messageInput}
              onChangeText={setMessageInput}
              placeholder="Enter message"
              placeholderTextColor={isDarkMode ? "#AAAAAA" : "#888888"}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: isDarkMode ? "#444444" : "#EEEEEE" }]}
                onPress={() => {
                  setShowModal(false);
                  setSenderInput("");
                  setMessageInput("");
                }}
              >
                <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.startButton,
                  (!senderInput.trim() || !messageInput.trim()) && styles.disabledButton,
                  { backgroundColor: isDarkMode ? "#0077B6" : "#1DA1F2" },
                ]}
                onPress={handleStartChat}
                disabled={!senderInput.trim() || !messageInput.trim()}
              >
                <Text style={styles.startButtonText}>Start Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal for editing transaction time */}
      <Modal
        visible={showEditTimeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowEditTimeModal(false);
          setEditTimeInput("");
          setEditingMessageId(null);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.modalContainer, { backgroundColor: isDarkMode ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)" }]}
        >
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                Edit Transaction Time
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEditTimeModal(false);
                  setEditTimeInput("");
                  setEditingMessageId(null);
                }}
              >
                <Text style={[styles.closeButton, { color: themeColors.text }]}>
                  X
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.modalInput, {
                borderColor: themeColors.border,
                color: themeColors.text,
                backgroundColor: themeColors.card,
              }]}
              value={editTimeInput}
              onChangeText={setEditTimeInput}
              placeholder="Enter time (e.g., 14:50)"
              placeholderTextColor={isDarkMode ? "#AAAAAA" : "#888888"}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: isDarkMode ? "#444444" : "#EEEEEE" }]}
                onPress={() => {
                  setShowEditTimeModal(false);
                  setEditTimeInput("");
                  setEditingMessageId(null);
                }}
              >
                <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.startButton,
                  !editTimeInput.trim() && styles.disabledButton,
                  { backgroundColor: isDarkMode ? "#0077B6" : "#1DA1F2" }
                ]}
                onPress={handleSaveEditedTime}
                disabled={!editTimeInput.trim()}
              >
                <Text style={styles.startButtonText}>Save Time</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,

  },
  headerText: {
    fontSize: 20,
    flex: 1,
    textAlign: "center",
    right: 20,
  },
  headerIcon1: {
    width: 50,
    height: 50,
    marginHorizontal: 5,
  },
  headerIcon2: {
    width: 22,
    height: 22,
    marginHorizontal: 4,
    bottom: -5,
  },
  headerIcon3: {
    width: 40,
    height: 40,
    marginHorizontal: 2,
    right: -10,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  dropdown: {
    position: "absolute",
    top: 70,
    right: 20,
    width: 150,
    borderRadius: 8,
    padding: 10,
    zIndex: 1000,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  dropdownText: {
    fontSize: 16,
  },
  list: {
    paddingBottom: 80,
  },
  messageContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 0,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  iconText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "normal",
  },
  messageContent: {
    flex: 1,
  },
  sender: {
    fontWeight: "normal",
    fontSize: 16,
  },
  message: {
    fontSize: 14,
  },
  time: {
    fontSize: 12,
  },
  chatButton: {
    position: "absolute",
    bottom: 10,
    alignSelf: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    right: 20,
  },
  chatButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
  },
  modalContent: {
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButton: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cancelButton: {
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    fontWeight: "bold",
  },
  startButton: {
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  startButtonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
  },
});

export default MessageScreen;