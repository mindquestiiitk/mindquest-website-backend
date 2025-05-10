import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { authService } from "../services/auth.service";
import { avatarImages } from "../constants/avatars";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { toast } from "../components/ui/use-toast";
import { Avatar } from "../components/Avatar";

export default function Profile() {
  const { user, updateUserProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedAvatarId, setSelectedAvatarId] = useState("");

  useEffect(() => {
    document.title = "MindQuest - Profile";

    // Redirect if not logged in
    if (!user) {
      navigate("/login");
      return;
    }

    // Initialize form with user data
    setName(user.name || "");
    setEmail(user.email || "");
    setSelectedAvatarId(user.avatarId || "default");
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    try {
      setIsLoading(true);

      // Only send the fields we want to update (name and avatarId)
      // Do NOT send email as it's causing Firestore errors
      const updateData = {
        name,
        avatarId: selectedAvatarId,
      };

      // Update profile in Firebase and local state
      await authService.updateProfile(updateData);

      // Update local user state
      updateUserProfile({
        ...user,
        ...updateData,
      });

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
        variant: "default",
      });
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to logout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-card-overlay-background">
            Your Profile
          </h1>
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2"
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414a1 1 0 00-.293-.707L11.414 2.414A1 1 0 0010.707 2H4a1 1 0 00-1 1zm10 8.414V17h-5v-5.586l5 .001zm-6-1V17H4V4h5v6.414l-2-2L5.586 10l4.414 4.414L14.414 10 13 8.586l-2 2z"
                clipRule="evenodd"
              />
            </svg>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-center p-4 bg-gray-50 rounded-lg mb-4">
                <div className="flex-shrink-0 relative group">
                  {/* Clickable Avatar with Popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="cursor-pointer relative">
                        <Avatar
                          size="xl"
                          showStatus={false}
                          clickable={false}
                          className="border-4 border-white shadow-md"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full flex items-center justify-center transition-all">
                          <span className="text-white opacity-0 group-hover:opacity-100 font-medium">
                            Change
                          </span>
                        </div>
                      </div>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 p-0" align="center">
                      <div className="p-4 border-b">
                        <h3 className="font-medium">Select Avatar</h3>
                        <p className="text-sm text-gray-500">
                          Choose a new profile picture
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 p-4 max-h-[300px] overflow-y-auto">
                        {avatarImages
                          .filter(
                            (avatar) =>
                              avatar.id !== "default" ||
                              avatar.src !==
                                avatarImages.find((a) => a.id === "prof1")?.src
                          )
                          .map((avatar) => (
                            <div
                              key={avatar.id}
                              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                                selectedAvatarId === avatar.id
                                  ? "border-green-500 shadow-md"
                                  : "border-gray-200 hover:border-green-300"
                              }`}
                              onClick={() => setSelectedAvatarId(avatar.id)}
                            >
                              <div className="aspect-square">
                                <img
                                  src={avatar.src}
                                  alt={avatar.alt}
                                  className="w-full h-full object-cover"
                                />
                                {selectedAvatarId === avatar.id && (
                                  <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
                                    <div className="bg-white rounded-full p-1">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-4 w-4 text-green-500"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="text-center md:text-left">
                  <h3 className="font-semibold text-lg">
                    {user.name || "User"}
                  </h3>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <div className="flex items-center justify-center md:justify-start mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {user.role || "User"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500">Email cannot be changed</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  value={user.role || "User"}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-gray-500">Role cannot be changed</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
              >
                {isLoggingOut ? "Logging out..." : "Logout"}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V7.414a1 1 0 00-.293-.707L11.414 2.414A1 1 0 0010.707 2H4a1 1 0 00-1 1zm10 8.414V17h-5v-5.586l5 .001zm-6-1V17H4V4h5v6.414l-2-2L5.586 10l4.414 4.414L14.414 10 13 8.586l-2 2z"
                    clipRule="evenodd"
                  />
                </svg>
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
