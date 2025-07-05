/**
 * Basic test for LandingScreen component
 *
 * This test verifies that the LandingScreen component renders correctly
 * and handles basic interactions.
 */

import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import LandingScreen from "../screens/LandingScreen";

// Mock navigation
const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
};

// Mock AsyncStorage
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
}));

// Mock Firebase
jest.mock("../firebase", () => ({
  getDb: jest.fn(() => null), // Return null to use sample data
}));

// Mock lucide-react-native icons
jest.mock("lucide-react-native", () => ({
  Search: "Search",
  Building: "Building",
  BookOpen: "BookOpen",
  Users: "Users",
  GraduationCap: "GraduationCap",
  ChevronRight: "ChevronRight",
  Shield: "Shield",
}));

// Mock expo-linear-gradient
jest.mock("expo-linear-gradient", () => "LinearGradient");

describe("LandingScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with sample organizations", async () => {
    const { getByText, getByPlaceholderText } = render(
      <LandingScreen navigation={mockNavigation} />
    );

    // Check if main elements are rendered
    expect(getByText("AITO Check")).toBeTruthy();
    expect(getByText("Connect to Your Org, Anytime!")).toBeTruthy();
    expect(getByPlaceholderText("Find My Org/Department")).toBeTruthy();
    expect(getByText("Available Organizations")).toBeTruthy();
    expect(getByText("Powered by Batanes State College")).toBeTruthy();
    expect(getByText("Admin Login")).toBeTruthy();

    // Wait for organizations to load
    await waitFor(() => {
      expect(getByText("BSIT Department")).toBeTruthy();
      expect(getByText("Nursing Department")).toBeTruthy();
      expect(getByText("Student Council")).toBeTruthy();
      expect(getByText("Admin Office")).toBeTruthy();
    });
  });

  it("handles search functionality", async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <LandingScreen navigation={mockNavigation} />
    );

    const searchInput = getByPlaceholderText("Find My Org/Department");

    // Wait for organizations to load
    await waitFor(() => {
      expect(getByText("BSIT Department")).toBeTruthy();
    });

    // Search for BSIT
    fireEvent.changeText(searchInput, "BSIT");

    // Should show only BSIT Department
    expect(getByText("BSIT Department")).toBeTruthy();
    expect(queryByText("Nursing Department")).toBeFalsy();
  });

  it("handles organization selection", async () => {
    const { getByText } = render(<LandingScreen navigation={mockNavigation} />);

    // Wait for organizations to load
    await waitFor(() => {
      expect(getByText("BSIT Department")).toBeTruthy();
    });

    // Click on Join Org button for BSIT Department
    const joinButton = getByText("Join Org");
    fireEvent.press(joinButton);

    // Should navigate to LoginScreen
    expect(mockNavigation.navigate).toHaveBeenCalledWith("LoginScreen");
  });

  it("handles admin login navigation", () => {
    const { getByText } = render(<LandingScreen navigation={mockNavigation} />);

    const adminLoginButton = getByText("Admin Login");
    fireEvent.press(adminLoginButton);

    expect(mockNavigation.navigate).toHaveBeenCalledWith("AdminLogin");
  });
});
