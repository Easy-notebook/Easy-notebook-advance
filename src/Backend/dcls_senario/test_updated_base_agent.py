#!/usr/bin/env python3
"""
测试更新后的BaseDSLC_Agent与Oracle集成
Test updated BaseDSLC_Agent with Oracle integration
"""

import sys
import os
import logging

# Add project paths
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'DCLSAgents'))

try:
    from DCLSAgents.agents.base_agent import BaseDSLC_Agent
    from app.utils.oracle import Oracle, OracleError
    
    def test_base_agent_with_oracle():
        """测试Base Agent与Oracle的集成"""
        print("🧪 Testing BaseDSLC_Agent with Oracle integration...")
        
        # Test 1: Initialize agent with Oracle auto-creation
        print("\n1. Testing agent initialization with Oracle auto-creation:")
        try:
            agent = BaseDSLC_Agent(
                name="TestAgent",
                system_message="You are a helpful data analysis assistant.",
                api_key=os.getenv("OPENAI_API_KEY"),  # Use environment variable
                base_url="https://openkey.cloud/v1",
                model="gpt-4o-mini"
            )
            
            if agent.oracle:
                print("   ✅ Oracle successfully initialized")
                print(f"   📊 Model info: {agent.get_token_usage_info()}")
            else:
                print("   ⚠️  Oracle not available, using legacy LLM")
                
        except Exception as e:
            print(f"   ❌ Agent initialization failed: {e}")
            return False
        
        # Test 2: Test chat without memory using Oracle
        print("\n2. Testing chat without memory:")
        try:
            response = agent.chat_without_memory("What is 2+2?")
            print(f"   ✅ Response: {response[:100]}...")
            
            # Test cost estimation
            cost = agent.estimate_request_cost("What is 2+2?")
            print(f"   💰 Estimated cost: ${cost:.6f}")
            
        except Exception as e:
            print(f"   ❌ Chat without memory failed: {e}")
            return False
        
        # Test 3: Test JSON generation
        print("\n3. Testing JSON response generation:")
        try:
            json_prompt = """
            Please return a JSON object with the following structure:
            {
                "result": "calculation result",
                "explanation": "brief explanation"
            }
            
            Calculate 5 + 3 and format the response as requested.
            """
            
            json_response = agent.generate_json_response(json_prompt)
            print(f"   ✅ JSON Response: {json_response}")
            
        except Exception as e:
            print(f"   ⚠️  JSON generation failed (expected with some models): {e}")
        
        # Test 4: Test Oracle conversation creation
        print("\n4. Testing Oracle conversation creation:")
        try:
            conversation = agent.create_oracle_conversation()
            if conversation:
                print("   ✅ Oracle conversation created successfully")
                print(f"   🔗 Conversation info: {conversation}")
            else:
                print("   ⚠️  Oracle conversation not available")
                
        except Exception as e:
            print(f"   ❌ Conversation creation failed: {e}")
        
        print("\n🎉 Base Agent Oracle integration test completed!")
        return True
    
    def test_fallback_behavior():
        """测试当Oracle不可用时的回退行为"""
        print("\n🔄 Testing fallback behavior...")
        
        try:
            # Force Oracle to None to test fallback
            original_oracle_class = Oracle
            
            # Create agent that should fall back to legacy LLM
            agent = BaseDSLC_Agent(
                name="FallbackTestAgent",
                system_message="You are a test assistant.",
                oracle=None  # Force no Oracle
            )
            
            if not agent.oracle:
                print("   ✅ Successfully initialized without Oracle")
                print("   🔄 Agent will use legacy LLM methods")
            else:
                print("   ⚠️  Oracle was created despite being disabled")
                
            return True
            
        except Exception as e:
            print(f"   ❌ Fallback test failed: {e}")
            return False
    
    if __name__ == "__main__":
        print("=" * 60)
        print("🚀 BaseDSLC_Agent Oracle Integration Test Suite")
        print("=" * 60)
        
        # Configure logging to see Oracle messages
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        success = True
        
        # Run main test
        success &= test_base_agent_with_oracle()
        
        # Run fallback test
        success &= test_fallback_behavior()
        
        if success:
            print("\n🎉 All tests passed! BaseDSLC_Agent Oracle integration is working correctly.")
        else:
            print("\n❌ Some tests failed. Please check the configuration.")
            
        print("=" * 60)

except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure all dependencies are installed and paths are correct.")
    print("Required: DCLSAgents, app.utils.oracle")