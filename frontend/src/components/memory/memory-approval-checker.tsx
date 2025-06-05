import React, { useEffect, useState } from 'react';
import { Memory, getPendingMemories } from '@/lib/actions/memories';
import { MemoryApprovalModal } from '../ui/memory-approval-modal';

/**
 * Component that periodically checks for memories that need approval
 * and displays a modal for the user to approve or reject them
 */
export function MemoryApprovalChecker() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [currentMemory, setCurrentMemory] = useState<Memory | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Function to fetch pending memories
  const fetchPendingMemories = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      const pendingMemories = await getPendingMemories();
      setMemories(pendingMemories);
      
      // If there are memories and no modal is open, show them all in the modal
      if (pendingMemories.length > 0 && !isModalOpen) {
        // Set the first memory as current for backward compatibility
        setCurrentMemory(pendingMemories[0]);
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Error fetching pending memories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle memory processing (approval/rejection)
  const handleMemoriesProcessed = () => {
    // All memories have been processed, close modal and clear state
    setMemories([]);
    setCurrentMemory(null);
    setIsModalOpen(false);
    
    // Check for new memories after a short delay
    setTimeout(() => {
      fetchPendingMemories();
    }, 1000);
  };

  // Close the modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentMemory(null);
  };

  // Check for pending memories on mount and every minute
  useEffect(() => {
    // Initial check
    fetchPendingMemories();
    
    // Set up interval to check every minute
    const intervalId = setInterval(fetchPendingMemories, 60000);
    
    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Render the modal if there are memories to approve
  return (
    <MemoryApprovalModal
      memory={currentMemory} // For backward compatibility
      memories={memories} // Pass all memories to the modal
      isOpen={isModalOpen && memories.length > 0}
      onClose={handleCloseModal}
      onApproved={handleMemoriesProcessed}
    />
  );
}
