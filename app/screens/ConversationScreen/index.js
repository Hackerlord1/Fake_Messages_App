import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../ThemeContext/ThemeContext";

const ConversationScreen = ({ route, navigation }) => {
  const { sender } = route.params || { sender: "M-PESA" };
  const { isDarkMode, colors: themeColors } = useTheme();
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [convo, setConvo] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");

  const formatTime = (timeStr) => {
    if (!timeStr) return "";
    if (!/^(?:[0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(timeStr)) return "";
    const [hours, minutes] = timeStr.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes) || hours > 23 || minutes > 59) return "";
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    // Basic validation for formats like "Mon, 02 Jun 2025" or "02/06/2025"
    const datePattern = /^(?:[A-Za-z]{3}, )?\d{1,2}\/\d{1,2}\/\d{2,4}$/;
    if (!datePattern.test(dateStr)) return "";
    return dateStr;
  };

  useEffect(() => {
    const loadConversation = async () => {
      setIsLoading(true);
      try {
        const savedConvo = await AsyncStorage.getItem(`conversation_${sender}`);
        if (savedConvo) {
          setConvo(JSON.parse(savedConvo));
        }
      } catch (error) {
        console.error("Error loading conversation:", error);
        Alert.alert("Error", "Failed to load conversation");
      } finally {
        setIsLoading(false);
      }
    };
    loadConversation();
  }, [sender]);

  const handleSaveMessage = async () => {
    if (!newMessage.trim() || !timeInput.trim()) {
      Alert.alert("Error", "Message and time are required.");
      return;
    }

    const formattedTime = formatTime(timeInput);
    const formattedDate = formatDate(dateInput);

    if (!formattedTime) {
      Alert.alert("Error", "Invalid time format. Use HH:MM (e.g., 14:50).");
      return;
    }

    if (isEditing) {
      const updatedConvo = convo.map((msg) =>
        msg.id === editingMessageId
          ? { ...msg, text: newMessage.trim(), timestamp: formattedTime, date: formattedDate || null }
          : msg
      );
      setConvo(updatedConvo);
      try {
        await AsyncStorage.setItem(`conversation_${sender}`, JSON.stringify(updatedConvo));
      } catch (error) {
        console.error("Error updating message:", error);
        Alert.alert("Error", "Failed to update message");
      }
    } else {
      const newMsg = {
        id: Date.now().toString(),
        text: newMessage.trim(),
        timestamp: formattedTime,
        date: formattedDate || null,
        ref: `REF${Math.floor(Math.random() * 1000000)}`,
      };

      const updatedConvo = [...convo, newMsg];
      setConvo(updatedConvo);
      try {
        await AsyncStorage.setItem(`conversation_${sender}`, JSON.stringify(updatedConvo));
      } catch (error) {
        console.error("Error saving conversation:", error);
        Alert.alert("Error", "Failed to save message");
      }
    }

    setNewMessage("");
    setDateInput("");
    setTimeInput("");
    setShowMessageModal(false);
    setIsEditing(false);
    setEditingMessageId(null);
  };

  const handleEditMessage = (id) => {
    const message = convo.find((msg) => msg.id === id);
    if (message) {
      setNewMessage(message.text);
      setEditingMessageId(id);
      setIsEditing(true);
      setDateInput(message.date || "");
      setTimeInput(message.timestamp || "");
      setShowMessageModal(true);
    }
  };

  const handleDeleteMessage = async (id) => {
    Alert.alert(
      "Delete Message",
      "Are you sure you want to delete this message?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedConvo = convo.filter((msg) => msg.id !== id);
            setConvo(updatedConvo);
            try {
              await AsyncStorage.setItem(`conversation_${sender}`, JSON.stringify(updatedConvo));
            } catch (error) {
              console.error("Error deleting message:", error);
              Alert.alert("Error", "Failed to delete message");
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
          text: "Edit",
          onPress: () => handleEditMessage(id),
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

  const renderMessage = ({ item }) => {
    const regex = new RegExp(
      '(' +
        '0[7|1][0-9]{8}|' +
        '\\+254[7|1][0-9]{8}|' +
        '\\*[0-9]+(?:\\*[0-9]+)*#' +
        '|https?://[^\\s]+|' +
        '\\d{1,2}/\\d{1,2}/\\d{2,4}\\s+at\\s+\\d{1,2}:\\d{2}' +
      ')',
      'g'
    );
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(item.text)) !== null) {
      const matchedText = match[0];
      const startIndex = match.index;
      if (startIndex > lastIndex) {
        parts.push({ text: item.text.slice(lastIndex, startIndex), isSpecial: false });
      }
      parts.push({ text: matchedText, isSpecial: true });
      lastIndex = startIndex + matchedText.length;
    }
    if (lastIndex < item.text.length) {
      parts.push({ text: item.text.slice(lastIndex), isSpecial: false });
    }

    return (
      <View style={styles.messageWrapper}>
        {item.date && (
          <Text style={[styles.messageDateTime, { color: isDarkMode ? "#AAAAAA" : "#666" }]}>
            {item.date} at {item.timestamp}
          </Text>
        )}
        <TouchableOpacity
          style={[styles.messageContainer, item.sender === "me" ? styles.myMessage : styles.theirMessage, {
            backgroundColor: item.sender === "me" ? (isDarkMode ? "#444444" : "#EDEEF1") : themeColors.card,
            borderColor: isDarkMode ? "#666666" : "#B2F0A1",
          }]}
          onLongPress={() => handleLongPress(item.id)}
          activeOpacity={1}
        >
          <Text style={[styles.messageText, { color: themeColors.text }]}>
            {parts.map((part, index) => (
              <Text
                key={index}
                style={
                  part.isSpecial
                    ? [styles.messageText, styles.specialText, { color: themeColors.text }]
                    : [styles.messageText, { color: themeColors.text }]
                }
              >
                {part.text}
              </Text>
            ))}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageRef, { color: isDarkMode ? "#CCCCCC" : "#555" }]}>
              M-PESA Ref. {item.ref}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={styles.messageTimeSafaricom}>
          <Text style={[styles.messageTime, { color: isDarkMode ? "#AAAAAA" : "#666" }]}>
            {item.timestamp}{' '}
          </Text>
          <Text style={[styles.messagedot, { color: isDarkMode ? "#AAAAAA" : "#666" }]}>. </Text>
          <Text style={[styles.safaricomText, { color: isDarkMode ? "#66B0FF" : "#3465D6" }]}>
            Safaricom
          </Text>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={isDarkMode ? "#66B0FF" : "#1E90FF"} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={themeColors.card}
      />
      <View style={[styles.header, { backgroundColor: themeColors.card }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={30} color={themeColors.text} />
        </TouchableOpacity>
        <View style={styles.headerProfileContainer}>
          <View style={[styles.profileCircle, { backgroundColor: isDarkMode ? "#FFD700" : "#FDD600" }]}>
            <Text style={styles.profileLetter}>{sender.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[styles.headerText, { color: themeColors.text }]}>
            {sender}
          </Text>
        </View>
        <TouchableOpacity onPress={() => setShowMenu(!showMenu)}>
          <Icon name="more-vert" size={30} color={themeColors.text} />
        </TouchableOpacity>
      </View>

      {showMenu && (
        <View style={[styles.menuContainer, { backgroundColor: themeColors.card }]}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              setShowMessageModal(true);
              setShowMenu(false);
              setIsEditing(false);
              setNewMessage("");
              setDateInput("");
              setTimeInput("");
            }}
          >
            <Icon name="add" size={20} color={themeColors.text} style={styles.menuIcon} />
            <Text style={[styles.menuText, { color: themeColors.text }]}>Add Message</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              Alert.alert(
                "Clear Conversation",
                "Are you sure you want to clear this conversation?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Clear",
                    style: "destructive",
                    onPress: async () => {
                      setConvo([]);
                      try {
                        await AsyncStorage.setItem(`conversation_${sender}`, JSON.stringify([]));
                      } catch (error) {
                        console.error("Error clearing conversation:", error);
                        Alert.alert("Error", "Failed to clear conversation");
                      }
                      setShowMenu(false);
                    },
                  },
                ]
              );
            }}
          >
            <Icon name="delete" size={20} color={themeColors.text} style={styles.menuIcon} />
            <Text style={[styles.menuText, { color: themeColors.text }]}>Clear Conversation</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={convo}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showMessageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowMessageModal(false);
          setIsEditing(false);
          setEditingMessageId(null);
          setNewMessage("");
          setDateInput("");
          setTimeInput("");
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.modalContainer, { backgroundColor: isDarkMode ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)" }]}
        >
          <View style={[styles.modalContent, { backgroundColor: themeColors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>
                {isEditing ? "Edit Message" : "Add New Message"}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowMessageModal(false);
                  setIsEditing(false);
                  setEditingMessageId(null);
                  setNewMessage("");
                  setDateInput("");
                  setTimeInput("");
                }}
              >
                <Icon name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.modalInput, {
                borderColor: themeColors.border,
                color: themeColors.text,
                backgroundColor: themeColors.card,
              }]}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder={isEditing ? "Edit your message..." : "Type your message..."}
              placeholderTextColor={isDarkMode ? "#AAAAAA" : "#888"}
              multiline
              autoFocus
            />

            <TextInput
              style={[styles.dateTimeInput, {
                borderColor: themeColors.border,
                color: themeColors.text,
                backgroundColor: themeColors.card,
              }]}
              value={dateInput}
              onChangeText={setDateInput}
              placeholder="Enter Date (e.g., 02/06/2025, Optional)"
              placeholderTextColor={isDarkMode ? "#AAAAAA" : "#888"}
            />

            <TextInput
              style={[styles.dateTimeInput, {
                borderColor: themeColors.border,
                color: themeColors.text,
                backgroundColor: themeColors.card,
              }]}
              value={timeInput}
              onChangeText={setTimeInput}
              placeholder="Enter Time (e.g., 14:50, Required)"
              placeholderTextColor={isDarkMode ? "#AAAAAA" : "#888"}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelButton, { backgroundColor: isDarkMode ? "#444444" : "#EEE" }]}
                onPress={() => {
                  setShowMessageModal(false);
                  setIsEditing(false);
                  setEditingMessageId(null);
                  setNewMessage("");
                  setDateInput("");
                  setTimeInput("");
                }}
              >
                <Text style={[styles.cancelButtonText, { color: themeColors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!newMessage.trim() || !timeInput.trim()) && styles.disabledButton,
                  { backgroundColor: isDarkMode ? "#0077B6" : "#1E90FF" },
                ]}
                onPress={handleSaveMessage}
                disabled={!newMessage.trim() || !timeInput.trim()}
              >
                <Text style={styles.saveButtonText}>
                  {isEditing ? "Update Message" : "Save Message"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <View style={[styles.cantReplyContainer, { backgroundColor: isDarkMode ? "#2A3B4C" : "#ECF4FB" }]}>
        <Text style={[styles.cantReply, { color: themeColors.text }]}>
          Can't reply to this short code.{' '}
          <Text style={[styles.learnMore, { color: isDarkMode ? "#66B0FF" : "#3465D6" }]}>
            Learn more
          </Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  headerProfileContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    right: 45,
  },
  profileLetter: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "normal",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "400",
    textAlign: "center",
    right: 42,
  },
  menuContainer: {
    position: "absolute",
    right: 10,
    top: 60,
    borderRadius: 8,
    elevation: 4,
    zIndex: 100,
    width: 200,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuText: {
    fontSize: 16,
  },
  messageList: {
    paddingBottom: 15,
    paddingHorizontal: 15,
  },
  messageWrapper: {
    marginBottom: 12,
    alignItems: "center",
  },
  messageContainer: {
    padding: 10,
    borderRadius: 20,
    elevation: 1,
    width: "93%",
  },
  myMessage: {
    alignSelf: "flex-end",
  },
  theirMessage: {
    alignSelf: "flex-start",
  },
  messageDateTime: {
    fontSize: 12,
    marginBottom: 5,
    textAlign: "center",
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  specialText: {
    textDecorationLine: "underline",
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
  },
  messageRef: {
    fontSize: 0,
    fontWeight: "bold",
  },
  messageTimeSafaricom: {
    flexDirection: "row",
    alignSelf: "flex-start",
    marginTop: 5,
  },
  messagedot: {
    marginTop: -5,
    fontSize: 12,
  },
  messageTime: {
    fontSize: 12,
  },
  safaricomText: {
    fontSize: 12,
  },
  cantReplyContainer: {
    paddingVertical: 30,
    alignItems: "center",
  },
  cantReply: {
    fontSize: 16,
    textAlign: "center",
  },
  learnMore: {
    textDecorationLine: "underline",
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
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    minHeight: 100,
    fontSize: 16,
    marginBottom: 20,
  },
  dateTimeInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
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
  saveButton: {
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#CCC",
  },
});

export default ConversationScreen;