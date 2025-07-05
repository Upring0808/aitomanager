import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const ADMIN_TABS = [
  { name: "Home", icon: "home", component: Ionicons },
  { name: "Events", icon: "calendar-outline", component: Ionicons },
  { name: "Fines", icon: "receipt", component: MaterialIcons },
  { name: "People", icon: "users", component: Feather },
  { name: "Profile", icon: "person-circle-outline", component: Ionicons },
];
