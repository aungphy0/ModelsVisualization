from flask import Flask, jsonify, request, send_from_directory
from flask import Flask, render_template

from flask_cors import CORS
from torchvision import models
import torch
from PIL import Image
from torchvision import transforms
import json
import os

import random
import glob
from skimage import io, transform
from torchvision import transforms
from torchvision.models import AlexNet_Weights

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads_images'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# UPLOAD_TRUTH_FOLDER = 'uploads_truth'
# app.config['UPLOAD_TRUTH_FOLDER'] = UPLOAD_TRUTH_FOLDER

FRONTEND_FOLDER = os.path.join(os.path.dirname(__file__), '../', 'frontend', 'client', 'src', 'imageMappingDataset')
FRONTEND_FOLDER_MC = os.path.join(os.path.dirname(__file__), '../', 'frontend', 'client', 'src', 'classMappingDataset')


os.makedirs(FRONTEND_FOLDER, exist_ok=True)
os.makedirs(FRONTEND_FOLDER_MC, exist_ok=True)

# app.config['MAX_CONTENT_LENGTH'] = 15000 * 1024 * 1024

############ AlexNet ################
def generate_alex_net(data, the_truth):

    modified_data = []
    misclassify = {}
    misclassified = []
    theClasses = []

    values=[]

    img_dir = data
    data_path = os.path.join(img_dir,'*g')
    files = glob.glob(data_path)
    data = []
    predictions=[]

    
    t_dir = the_truth
    t_data = os.path.join(t_dir, '*json')
    td = glob.glob(t_data)
    truth = td[0]
    truth_file = open(truth,"r")
    true= json.loads(truth_file.read())
    class_file = open('./classes.json',"r")
    classes= json.loads(class_file.read())[0]


    truthlabel = open('./synset_list_2012_details.json', "r")
    labeldata = json.loads(truthlabel.read())
    # print(labeldata)
    synset_dict = {item['synset_code']: item['name'] for item in labeldata}
    index_dict = {item['id']: item['name'] for item in labeldata}


    childsynset = open('./synset_class_hierarchy_2012.json', "r")
    cs = json.loads(childsynset.read())
    childsynset_dict = {}

    for item in cs:
        synset_code = item['synset_code']
        for code in item['hierarchyCodes']:
            childsynset_dict[code] = synset_code

    #alexnet, mobilenet_v3_small shufflenet_v2_x1_0 squeezenet1_0 mnasnet0_5 squeezenet1_1

    CNN = models.alexnet(pretrained=True)
    # CNN = models.alexnet(weights=AlexNet_Weights.DEFAULT)

    images=[]

    for f1 in files:
        data.append(f1)

    conv_image=[]


    transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor()   ,
        transforms.Normalize(
        mean = [.485, .456, .406],
        std= [.229, .224, .225])
        ])
    for i in range(len(data)):
        img=Image.open(data[i])
        img.resize((256,256))
        img = transform(img)
        images.append(torch.unsqueeze(img,0))
        CNN.eval()

    for i in range (len(images)):
        conv_image.append(CNN(images[i]))
    names=[]
    preds=[]
    total_per=[]
    # for i in range (len(conv_image)):
    for i in range(len(conv_image)):
        conv=conv_image[i]

        # print("********************************************")
        # print(conv[0][1])

        _, indices = torch.sort(conv, descending=True)
        percentage = torch.nn.functional.softmax(conv, dim=1)[0] # * 100
        per=[]

        print("********************************************")
        print(percentage[0].item())

        print("&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&")
        print(indices[0])
        name = str([(classes[idx]) for idx in indices[0][:1]])

        string = ""
        string2=""
        string+=true[i][0]
        for z in range(len(true[i])-1):
            string+=", "
            string+=true[i][z+1]

        for z in range(len(name)-4):
            string2+=name[z+2]

        names.append(string2)
        if(string==(string2)):

            predictions.append(1)
        else:
            predictions.append(0)

        # strin="img"
        # strin+=""+str(i)+""
        # strin+=".jpg"
        strin = str(files[i]).split('/')[2]

        print("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
        print(strin)
        
        synset = strin.split('_')
        actual = ""

        if synset[0] in synset_dict:
            actual = synset_dict[synset[0]]
            print(synset_dict[synset[0]])
        else:
            actual = synset_dict[childsynset_dict[synset[0]]]
            print(synset_dict[childsynset_dict[synset[0]]])

        # for idx in indices[0]:
        #     per.append(percentage[idx].item())
        # totPercent=[]
        # total_per.append(per)

        predict = ""
        for i in range(len(percentage)):
            per.append(percentage[i].item())
        totPercent=[]
        total_per.append(per)


        max_prob = max(per)
        mp = round(max_prob, 2)

        print(per.index(max(per)))
        print(index_dict[per.index(max(per))+1])
        predict = index_dict[per.index(max(per))+1]
        print("#########################################")
        print(per)
        print(len(per))

        value = 0

        # if predict is actual: 
        #     value = 1
        # else:
        #     value = 3


        mc = {
            "actual": actual,
            "predicted": predict,
            "image": []
        }

        mc['image'].append(strin)
        misclassified.append(mc)


        key = (actual, predict)

        if key not in misclassify:

            misclassify[key] = {
                "actual": actual,
                "predicted": predict,
                "value": value,
                "max_prob": mp,
                "image": []
            }

        misclassify[key]['image'].append(strin)
        misclassify[key]['value'] = misclassify[key]['value'] + 1
        print(misclassify)
        
        theClasses.append(actual)
        

        entry = {
            "actual": actual,
            "predicted": predict,
            "name": strin,
            "probabilities": per,
        }

        modified_data.append(entry)

        preds.append(max(per))
        for l in range(len(per)):

            totPercent.append(per[l])

    # json_data = json.dumps(values)
    #
    # with open('alexnet.json', 'w') as f:
    #     f.write(json_data)

    ans = 0
    for i in range(len(predictions)):
        if(predictions[i]==1):
            ans+=1

    print(ans)
    print(len(predictions))
    print(len(preds))


    # modified_data = {
    #     "data": []
    # }


    # for i in range(len(predictions)):
    #     image_path = data[i]
    #     image_filename = os.path.basename(image_path)
    #     image_name = image_filename[-10:]
    #     true_labels = ", ".join(true[i])
    #     accuracy = False
    #     if (true_labels==names[i]):
    #         accuracy=True
    #     entry = {
    #         "image_name": image_name,
    #         "true_label": true_labels,
    #         "predicted_label_model_Alexnet": f" {names[i]}",
    #         "confidence_model_AlexNet_result": preds[i]/100,
    #         "Alex_Net_accuracy":accuracy,
    #
    #     }
    #
    #
    #
    #     modified_data["data"].append(entry)
    #
    # print(per)


    x=0

    out_file = "alexnetdata.json"

    with open(out_file, "w") as of:
        json.dump(misclassified, of, indent=4)

    print(f"The mc data has been written to `{out_file}`.")


    misclass = list(misclassify.values())
    out_file = "misclassify_alexnet.json"

    with open(out_file, "w") as jf:
        json.dump(misclass, jf, indent=4)

    print(f"The misclassify data has been written to `{out_file}`.")
    print(theClasses)

    # output_json_file = "Alex_Net_values.json"
    output_json_file = "Alexnet.json"

    with open(output_json_file, "w") as json_file:
        json.dump(modified_data, json_file, indent=4)

    print(f"The modified data has been written to '{output_json_file}'.")
    output_dir = "class_json_files"
    os.makedirs(output_dir, exist_ok=True)


    for class_idx in range(1000):
        class_name = classes[class_idx]
        class_filename = os.path.join(output_dir, f"class_{class_name}.json")


        class_data = []

        for i in range(len(total_per)):
            image_name = f"img{i}.jpg"
            accuracy = total_per[i][class_idx]
            maxi= preds[i]


            image_entry = {
                "image_name": image_name,
                "accuracy": accuracy,
                "max": maxi

            }


            class_data.append(image_entry)


        with open(class_filename, "w") as json_file:
            json.dump(class_data, json_file, indent=4)

    print("Individual JSON files created for each class.")


################# MobileNet ########################
def generate_mobile_net(data, the_truth):


    modified_data = []
    misclassify = {}
    misclassified = []
    theClasses = []

    values=[]

    img_dir = data
    data_path = os.path.join(img_dir,'*g')
    files = glob.glob(data_path)
    data = []
    predictions=[]


    t_dir = the_truth
    t_data = os.path.join(t_dir, '*json')
    td = glob.glob(t_data)
    truth = td[0]
    truth_file = open(truth,"r")
    true= json.loads(truth_file.read())
    class_file = open('./classes.json',"r")
    classes= json.loads(class_file.read())[0]


    truthlabel = open('./synset_list_2012_details.json', "r")
    labeldata = json.loads(truthlabel.read())
    # print(labeldata)
    synset_dict = {item['synset_code']: item['name'] for item in labeldata}
    index_dict = {item['id']: item['name'] for item in labeldata}


    childsynset = open('./synset_class_hierarchy_2012.json', "r")
    cs = json.loads(childsynset.read())
    childsynset_dict = {}

    for item in cs:
        synset_code = item['synset_code']
        for code in item['hierarchyCodes']:
            childsynset_dict[code] = synset_code




#alexnet, mobilenet_v3_small shufflenet_v2_x1_0 squeezenet1_0 mnasnet0_5 squeezenet1_1

    CNN = models.mobilenet_v3_small(pretrained=True)

    images=[]

    for f1 in files:
        data.append(f1)
    conv_image=[]

    transform = transforms.Compose([
        transforms.Resize(256),
        transforms.CenterCrop(224),
        transforms.ToTensor()   ,
        transforms.Normalize(
        mean = [.485, .456, .406],
        std= [.229, .224, .225])
        ])
    for i in range(len(data)):
        img=Image.open(data[i])
        img.resize((256,256))
        img = transform(img)
        images.append(torch.unsqueeze(img,0))
        CNN.eval()

    for i in range (len(images)):
        conv_image.append(CNN(images[i]))
    names=[]
    preds=[]
    total_per=[]
    # for i in range (len(conv_image)):
    for i in range(len(conv_image)):
        conv=conv_image[i]

        _, indices = torch.sort(conv, descending=True)
        percentage = torch.nn.functional.softmax(conv, dim=1)[0] # * 100
        per=[]


        name = str([(classes[idx]) for idx in indices[0][:1]])

        string = ""
        string2=""
        string+=true[i][0]
        for z in range(len(true[i])-1):
            string+=", "
            string+=true[i][z+1]

        for z in range(len(name)-4):
            string2+=name[z+2]

        names.append(string2)
        if(string==(string2)):

            predictions.append(1)
        else:
            predictions.append(0)

        # strin="img"
        # strin+=""+str(i)+""
        # strin+=".jpg"
        strin = str(files[i]).split('/')[2]


        print("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
        print(strin)
        
        synset = strin.split('_')
        actual = ""

        if synset[0] in synset_dict:
            actual = synset_dict[synset[0]]
            print(synset_dict[synset[0]])
        else:
            actual = synset_dict[childsynset_dict[synset[0]]]
            print(synset_dict[childsynset_dict[synset[0]]])

        # for idx in indices[0]:
        #     per.append(percentage[idx].item())
        # totPercent=[]
        # total_per.append(per)

        predict = ""
        for i in range(len(percentage)):
            per.append(percentage[i].item())
        totPercent=[]
        total_per.append(per)


        max_prob = max(per)
        mp = round(max_prob, 2)

        print(per.index(max(per)))
        print(index_dict[per.index(max(per))+1])
        predict = index_dict[per.index(max(per))+1]
        print("#########################################")
        print(per)
        print(len(per))


        value = 0

        # if predict is actual: 
        #     value = 2
        # else:
        #     value = 4

        mc = {
            "actual": actual,
            "predicted": predict,
            "image": []
        }

        mc['image'].append(strin)
        misclassified.append(mc)


        key = (actual, predict)

        if key not in misclassify:

            misclassify[key] = {
                "actual": actual,
                "predicted": predict,
                "value": value,
                "max_prob": mp,
                "image": []
            }

        misclassify[key]['image'].append(strin)
        misclassify[key]['value'] = misclassify[key]['value'] + 1

        theClasses.append(actual)
        



        
        for i in range(len(percentage)):
            per.append(percentage[i].item())
        totPercent=[]
        total_per.append(per)


        print(max(per))

        entry = {
            "actual": actual,
            "predicted": predict,
            "name": strin,
            "probabilities": per,
        }

        modified_data.append(entry)

        preds.append(max(per))
        for l in range(len(per)):

            totPercent.append(per[l])

    # json_data = json.dumps(values)
    #
    # with open('mobilenet.json', 'w') as f:
    #     f.write(json_data)

    ans = 0
    for i in range(len(predictions)):
        if(predictions[i]==1):
            ans+=1

    print(ans)
    print(len(predictions))
    print(len(preds))


    # modified_data = {
    #     "data": []
    # }
    #
    #
    # for i in range(len(predictions)):
    #     image_path = data[i]
    #     image_filename = os.path.basename(image_path)
    #     image_name = image_filename[-10:]
    #     true_labels = ", ".join(true[i])
    #     accuracy = False
    #     if (true_labels==names[i]):
    #         accuracy=True
    #     entry = {
    #         "image_name": image_name,
    #         "true_label": true_labels,
    #         "predicted_label_model_Mobilenet": f" {names[i]}",
    #         "confidence_model_MobileNet_result": preds[i]/100,
    #         "Mobile_Net_accuracy":accuracy,
    #
    #     }
    #
    #
    #
    #     modified_data["data"].append(entry)
    #
    # print(per)


    x=0

    out_file = "mobilenetdata.json"

    with open(out_file, "w") as of:
        json.dump(misclassified, of, indent=4)

    print(f"The mc data has been written to `{out_file}`.")

    misclass = list(misclassify.values())
    out_file = "misclassify_mobilenet.json"

    with open(out_file, "w") as jf:
        json.dump(misclass, jf, indent=4)

    print(f"The misclassify data has been written to `{out_file}`.")
    print(theClasses)


    output_json_file = "Mobilenet.json"

    with open(output_json_file, "w") as json_file:
        json.dump(modified_data, json_file, indent=4)

    print(f"The modified data has been written to '{output_json_file}'.")
    output_dir = "class_json_files"
    os.makedirs(output_dir, exist_ok=True)


    for class_idx in range(1000):
        class_name = classes[class_idx]
        class_filename = os.path.join(output_dir, f"class_{class_name}.json")


        class_data = []

        for i in range(len(total_per)):
            image_name = f"img{i}.jpg"
            accuracy = total_per[i][class_idx]

            image_entry = {
                "image_name": image_name,
                "accuracy": accuracy
            }

            # print(image_name)
            # print(accuracy)

            class_data.append(image_entry)

        with open(class_filename, "w") as json_file:
            json.dump(class_data, json_file, indent=4)

    print("Individual JSON files created for each class.")

###################### ShuffleNet #############################
def generate_shuffle_net(data, the_truth):

    modified_data = []
    misclassify = {}
    misclassified = []
    theClasses = []

    values=[]

    #replace with your own path to the dataset
    img_dir = data
    data_path = os.path.join(img_dir,'*g')
    files = glob.glob(data_path)
    data = []
    predictions=[]


    t_dir = the_truth
    t_data = os.path.join(t_dir, '*json')
    td = glob.glob(t_data)
    truth = td[0]
    truth_file = open(truth,"r")
    true= json.loads(truth_file.read())
    class_file = open('./classes.json',"r")
    classes= json.loads(class_file.read())[0]


    truthlabel = open('./synset_list_2012_details.json', "r")
    labeldata = json.loads(truthlabel.read())
    # print(labeldata)
    synset_dict = {item['synset_code']: item['name'] for item in labeldata}
    index_dict = {item['id']: item['name'] for item in labeldata}


    childsynset = open('./synset_class_hierarchy_2012.json', "r")
    cs = json.loads(childsynset.read())
    childsynset_dict = {}

    for item in cs:
        synset_code = item['synset_code']
        for code in item['hierarchyCodes']:
            childsynset_dict[code] = synset_code


    #alexnet, mobilenet_v3_small shufflenet_v2_x1_0 squeezenet1_0 mnasnet0_5 squeezenet1_1

    CNN = models.shufflenet_v2_x1_0(pretrained=True)

    images=[]

    for f1 in files:
        data.append(f1)
    conv_image=[]

    transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor()   ,
            transforms.Normalize(
            mean = [.485, .456, .406],
            std= [.229, .224, .225])
            ])
    for i in range(len(data)):
            img=Image.open(data[i])
            img.resize((256,256))
            img = transform(img)
            images.append(torch.unsqueeze(img,0))
            CNN.eval()

    for i in range (len(images)):
        conv_image.append(CNN(images[i]))
    names=[]
    preds=[]
    total_per=[]

    # for i in range (len(conv_image)):
    for i in range(len(conv_image)):
        conv=conv_image[i]

        _, indices = torch.sort(conv, descending=True)
        percentage = torch.nn.functional.softmax(conv, dim=1)[0] # * 100
        per=[]

        name = str([(classes[idx]) for idx in indices[0][:1]])

        string = ""
        string2=""
        string+=true[i][0]
        for z in range(len(true[i])-1):
            string+=", "
            string+=true[i][z+1]

        for z in range(len(name)-4):
            string2+=name[z+2]

        names.append(string2)

        if(string==(string2)):

            predictions.append(1)
        else:
            predictions.append(0)

        # strin="img"
        # strin+=""+str(i)+""
        # strin+=".jpg"
        strin = str(files[i]).split('/')[2]

        print("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
        print(strin)

        synset = strin.split('_')
        actual = ""

        if synset[0] in synset_dict:
            actual = synset_dict[synset[0]]
            print(synset_dict[synset[0]])
        else:
            actual = synset_dict[childsynset_dict[synset[0]]]
            print(synset_dict[childsynset_dict[synset[0]]])


        # for idx in indices[0]:
        #     per.append(percentage[idx].item())
        # totPercent=[]
        for i in range(len(percentage)):
            per.append(percentage[i].item())
        totPercent=[]
        total_per.append(per)


        max_prob = max(per)
        mp = round(max_prob, 2)

        predict = ""
        print(per.index(max(per)))
        print(index_dict[per.index(max(per))+1])
        predict = index_dict[per.index(max(per))+1]

        print("#########################################")
        print(per)
        print(len(per))


        value = 0

        # if predict is actual: 
        #     value = 5
        # else:
        #     value = 7

        mc = {
            "actual": actual,
            "predicted": predict,
            "image": []
        }

        mc['image'].append(strin)
        misclassified.append(mc)

        key = (actual, predict)

        if key not in misclassify:

            misclassify[key] = {
                "actual": actual,
                "predicted": predict,
                "value": value,
                "max_prob": mp,
                "image": []
            }

        misclassify[key]['image'].append(strin)
        misclassify[key]['value'] = misclassify[key]['value'] + 1


        theClasses.append(actual)
        



        entry = {
            "actual":actual,
            "predicted": predict,
            "name": strin,
            "probabilities": per,
        }

        modified_data.append(entry)

        for l in range(len(per)):
            totPercent.append(per[l])
        values.append(totPercent)

    # json_data = json.dumps(values)
    #
    # with open('shufflenet.json', 'w') as f:
    #     f.write(json_data)

    ans = 0
    for i in range(len(predictions)):
        if(predictions[i]==1):
            ans+=1

    print(ans)
    print(len(predictions))


    out_file = "shufflenetdata.json"

    with open(out_file, "w") as of:
        json.dump(misclassified, of, indent=4)

    print(f"The mc data has been written to `{out_file}`.")

    misclass = list(misclassify.values())
    out_file = "misclassify_shufflenet.json"

    with open(out_file, "w") as jf:
        json.dump(misclass, jf, indent=4)

    print(f"The misclassify data has been written to `{out_file}`.")
    print(theClasses)

    output_json_file = "Shufflenet.json"

    with open(output_json_file, "w") as json_file:
        json.dump(modified_data, json_file, indent=4)

    print(f"The modified data has been written to '{output_json_file}'.")


    # output_dir = "class_json_files"
    # os.makedirs(output_dir, exist_ok=True)
    #
    # for class_idx in range(1000):
    #     class_name = classes[class_idx]
    #     class_filename = os.path.join(output_dir, f"class_{class_name}.json")
    #
    #
    #     class_data = []
    #
    #     for i in range(len(total_per)):
    #         image_name = f"img{i}.jpg"
    #         accuracy = total_per[i][class_idx]
    #
    #         image_entry = {
    #         "image_name": image_name,
    #         "accuracy": accuracy
    #     }
    #
    #         print(image_name)
    #         print(accuracy)
    #
    #         class_data.append(image_entry)
    #
    #     with open(class_filename, "w") as json_file:
    #         json.dump(class_data, json_file, indent=4)
    #
    # print("Individual JSON files created for each class.")

##################### squeezenet1_0Net ##########################
def generate_squeeze1_0_net(data, the_truth):

    modified_data = []
    misclassify = {}
    misclassified = []
    theClasses = []

    values=[]

    img_dir = data
    data_path = os.path.join(img_dir,'*g')
    files = glob.glob(data_path)
    data = []
    predictions=[]


    t_dir = the_truth
    t_data = os.path.join(t_dir, '*json')
    td = glob.glob(t_data)
    truth = td[0]
    truth_file = open(truth,"r")
    true= json.loads(truth_file.read())
    class_file = open('./classes.json',"r")
    classes= json.loads(class_file.read())[0]


    truthlabel = open('./synset_list_2012_details.json', "r")
    labeldata = json.loads(truthlabel.read())
    # print(labeldata)
    synset_dict = {item['synset_code']: item['name'] for item in labeldata}
    index_dict = {item['id']: item['name'] for item in labeldata}


    childsynset = open('./synset_class_hierarchy_2012.json', "r")
    cs = json.loads(childsynset.read())
    childsynset_dict = {}

    for item in cs:
        synset_code = item['synset_code']
        for code in item['hierarchyCodes']:
            childsynset_dict[code] = synset_code

    #alexnet, mobilenet_v3_small shufflenet_v2_x1_0 squeezenet1_0 mnasnet0_5 squeezenet1_1

    CNN = models.squeezenet1_1(pretrained=True)

    images=[]

    for f1 in files:
        data.append(f1)
    conv_image=[]

    transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor()   ,
            transforms.Normalize(
            mean = [.485, .456, .406],
            std= [.229, .224, .225])
            ])
    for i in range(len(data)):
            img=Image.open(data[i])
            img.resize((256,256))
            img = transform(img)
            images.append(torch.unsqueeze(img,0))
            CNN.eval()

    for i in range (len(images)):
        conv_image.append(CNN(images[i]))

    names = []
    preds = []
    total_per = []

    # for i in range (len(conv_image)):
    for i in range(len(conv_image)):
        conv=conv_image[i]

        _, indices = torch.sort(conv, descending=True)
        percentage = torch.nn.functional.softmax(conv, dim=1)[0] # * 100
        per=[]

        name = str([(classes[idx]) for idx in indices[0][:1]])

        string = ""
        string2=""
        string+=true[i][0]
        for z in range(len(true[i])-1):
            string+=", "
            string+=true[i][z+1]

        for z in range(len(name)-4):
            string2+=name[z+2]

        if(string==(string2)):

            predictions.append(1)
        else:
            predictions.append(0)


        # strin="img"
        # strin+=""+str(i)+""
        # strin+=".jpg"
        strin = str(files[i]).split('/')[2]

        print("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
        print(strin)


        synset = strin.split('_')
        actual = ""

        if synset[0] in synset_dict:
            actual = synset_dict[synset[0]]
            print(synset_dict[synset[0]])
        else:
            actual = synset_dict[childsynset_dict[synset[0]]]
            print(synset_dict[childsynset_dict[synset[0]]])


        # for idx in indices[0]:
        #     per.append(percentage[idx].item())
        # totPercent=[]

        for i in range(len(percentage)):
            per.append(percentage[i].item())
        totPercent=[]
        total_per.append(per)


        max_prob = max(per)
        mp = round(max_prob, 2)

        predict = ""
        print(per.index(max(per)))
        print(index_dict[per.index(max(per))+1])
        predict = index_dict[per.index(max(per))+1]


        value = 0

        # if predict is actual: 
        #     value = 6
        # else:
        #     value = 8

        mc = {
            "actual": actual,
            "predicted": predict,
            "image": []
        }

        mc['image'].append(strin)
        misclassified.append(mc)


        key = (actual, predict)

        if key not in misclassify:

            misclassify[key] = {
                "actual": actual,
                "predicted": predict,
                "value": value,
                "max_prob": mp,
                "image": []
            }

        misclassify[key]['image'].append(strin)
        misclassify[key]['value'] = misclassify[key]['value'] + 1

        theClasses.append(actual)
        


        entry = {
            "actual": actual,
            "predicted": predict,
            "name": strin,
            "probabilities": per,
        }

        modified_data.append(entry)

        for l in range(len(per)):
            totPercent.append(per[l])
        values.append(totPercent)

    # json_data = json.dumps(values)
    #
    # with open('squeezenet1_0.json', 'w') as f:
    #     f.write(json_data)

    ans = 0
    for i in range(len(predictions)):
        if(predictions[i]==1):
            ans+=1

    print(ans)
    print(len(predictions))


    out_file = "squeeze1_0data.json"

    with open(out_file, "w") as of:
        json.dump(misclassified, of, indent=4)

    print(f"The mc data has been written to `{out_file}`.")

    misclass = list(misclassify.values())
    out_file = "misclassify_squeeze1_0.json"

    with open(out_file, "w") as jf:
        json.dump(misclass, jf, indent=4)

    print(f"The misclassify data has been written to `{out_file}`.")
    print(theClasses)

    output_json_file = "Squeezenet1_0.json"

    with open(output_json_file, "w") as json_file:
        json.dump(modified_data, json_file, indent=4)

    print(f"The modified data has been written to '{output_json_file}'.")


##################### squeezenet1_1Net #############################
def generate_squeeze1_1_net(data, the_truth):

    modified_data = []
    misclassify = {}
    misclassified = []
    theClasses = []

    values=[]
    #replace with your own path to the dataset
    img_dir = data
    data_path = os.path.join(img_dir,'*g')
    files = glob.glob(data_path)
    data = []
    predictions=[]


    t_dir = the_truth
    t_data = os.path.join(t_dir, '*json')
    td = glob.glob(t_data)
    truth = td[0]
    truth_file = open(truth,"r")
    true= json.loads(truth_file.read())
    class_file = open('./classes.json',"r")
    classes= json.loads(class_file.read())[0]


    truthlabel = open('./synset_list_2012_details.json', "r")
    labeldata = json.loads(truthlabel.read())
    # print(labeldata)
    synset_dict = {item['synset_code']: item['name'] for item in labeldata}
    index_dict = {item['id']: item['name'] for item in labeldata}


    childsynset = open('./synset_class_hierarchy_2012.json', "r")
    cs = json.loads(childsynset.read())
    childsynset_dict = {}

    for item in cs:
        synset_code = item['synset_code']
        for code in item['hierarchyCodes']:
            childsynset_dict[code] = synset_code

    #alexnet, mobilenet_v3_small shufflenet_v2_x1_0 squeezenet1_0 mnasnet0_5 squeezenet1_1

    CNN = models.squeezenet1_1(pretrained=True)

    images=[]

    for f1 in files:
        data.append(f1)
    conv_image=[]

    transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor()   ,
            transforms.Normalize(
            mean = [.485, .456, .406],
            std= [.229, .224, .225])
            ])
    for i in range(len(data)):
            img=Image.open(data[i])
            img.resize((256,256))
            img = transform(img)
            images.append(torch.unsqueeze(img,0))
            CNN.eval()

    for i in range (len(images)):
        conv_image.append(CNN(images[i]))

    names=[]
    preds=[]
    total_per=[]

    # for i in range (len(conv_image)):
    for i in range(len(conv_image)):
        conv=conv_image[i]

        _, indices = torch.sort(conv, descending=True)
        percentage = torch.nn.functional.softmax(conv, dim=1)[0]  # * 100
        per=[]

        name = str([(classes[idx]) for idx in indices[0][:1]])

        string = ""
        string2=""
        string+=true[i][0]
        for z in range(len(true[i])-1):
            string+=", "
            string+=true[i][z+1]

        for z in range(len(name)-4):
            string2+=name[z+2]

        if(string==(string2)):

            predictions.append(1)
        else:
            predictions.append(0)

        # strin="img"
        # strin+=""+str(i)+""
        # strin+=".jpg"
        strin = str(files[i]).split('/')[2]

        print("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
        print(strin)


        synset = strin.split('_')
        actual = ""

        if synset[0] in synset_dict:
            actual = synset_dict[synset[0]]
            print(synset_dict[synset[0]])
        else:
            actual = synset_dict[childsynset_dict[synset[0]]]
            print(synset_dict[childsynset_dict[synset[0]]])




        # for idx in indices[0]:
        #     per.append(percentage[idx].item())
        # totPercent=[]

        for i in range(len(percentage)):
            per.append(percentage[i].item())
        totPercent=[]
        total_per.append(per)


        max_prob = max(per)
        mp = round(max_prob, 2)

        predict = ""
        print(per.index(max(per)))
        print(index_dict[per.index(max(per))+1])
        predict = index_dict[per.index(max(per))+1]


        value = 0

        # if predict is actual: 
        #     value = 9
        # else:
        #     value = 11


        mc = {
            "actual": actual,
            "predicted": predict,
            "image": []
        }

        mc['image'].append(strin)
        misclassified.append(mc)

        key = (actual, predict)

        if key not in misclassify:

            misclassify[key] = {
                "actual": actual,
                "predicted": predict,
                "value": value,
                "max_prob": mp,
                "image": []
            }

        misclassify[key]['image'].append(strin)
        misclassify[key]['value'] = misclassify[key]['value'] + 1

        theClasses.append(actual)
        


        entry = {
            "actual": actual,
            "predicted": predict,
            "name": strin,
            "probabilities": per,
        }

        modified_data.append(entry)


        for l in range(len(per)):
            totPercent.append(per[l])
        values.append(totPercent)

    # json_data = json.dumps(values)
    #
    # with open('squeezenet1_1.json', 'w') as f:
    #     f.write(json_data)

    ans = 0
    for i in range(len(predictions)):
        if(predictions[i]==1):
            ans+=1

    print(ans)
    print(len(predictions))


    out_file = "squeeze1_1data.json"

    with open(out_file, "w") as of:
        json.dump(misclassified, of, indent=4)

    print(f"The mc data has been witten to `{out_file}`.")

    misclass = list(misclassify.values())
    out_file = "misclassify_squeeze1_1.json"

    with open(out_file, "w") as jf:
        json.dump(misclass, jf, indent=4)

    print(f"The misclassify data has been written to `{out_file}`.")
    print(theClasses)



    output_json_file = "Squeezenet1_1.json"

    with open(output_json_file, "w") as json_file:
        json.dump(modified_data, json_file, indent=4)

    print(f"The modified data has been written to '{output_json_file}'.")


##################### mnasnet0_5 #############################
def generate_mnasnet0_5_net(data, the_truth):

    modified_data = []
    misclassify = {}
    misclassified = []
    theClasses = []

    values=[]
    #replace with your own path to the dataset
    img_dir = data
    data_path = os.path.join(img_dir,'*g')
    files = glob.glob(data_path)
    data = []
    predictions=[]


    t_dir = the_truth
    t_data = os.path.join(t_dir, '*json')
    td = glob.glob(t_data)
    truth = td[0]
    truth_file = open(truth,"r")
    true= json.loads(truth_file.read())
    class_file = open('./classes.json',"r")
    classes= json.loads(class_file.read())[0]


    truthlabel = open('./synset_list_2012_details.json', "r")
    labeldata = json.loads(truthlabel.read())
    # print(labeldata)
    synset_dict = {item['synset_code']: item['name'] for item in labeldata}
    index_dict = {item['id']: item['name'] for item in labeldata}


    childsynset = open('./synset_class_hierarchy_2012.json', "r")
    cs = json.loads(childsynset.read())
    childsynset_dict = {}

    for item in cs:
        synset_code = item['synset_code']
        for code in item['hierarchyCodes']:
            childsynset_dict[code] = synset_code

    #alexnet, mobilenet_v3_small shufflenet_v2_x1_0 squeezenet1_0 mnasnet0_5 squeezenet1_1

    CNN = models.resnet18(pretrained=True)

    images=[]

    for f1 in files:
        data.append(f1)
    conv_image=[]

    transform = transforms.Compose([
            transforms.Resize(256),
            transforms.CenterCrop(224),
            transforms.ToTensor()   ,
            transforms.Normalize(
            mean = [.485, .456, .406],
            std= [.229, .224, .225])
            ])
    for i in range(len(data)):
            img=Image.open(data[i])
            img.resize((256,256))
            img = transform(img)
            images.append(torch.unsqueeze(img,0))
            CNN.eval()

    for i in range (len(images)):
        conv_image.append(CNN(images[i]))

    names=[]
    preds=[]
    total_per=[]

    # for i in range (len(conv_image)):
    for i in range(len(conv_image)):
        conv=conv_image[i]

        _, indices = torch.sort(conv, descending=True)
        percentage = torch.nn.functional.softmax(conv, dim=1)[0] # * 100
        per=[]

        name = str([(classes[idx]) for idx in indices[0][:1]])

        string = ""
        string2=""
        string+=true[i][0]
        for z in range(len(true[i])-1):
            string+=", "
            string+=true[i][z+1]

        for z in range(len(name)-4):
            string2+=name[z+2]

        if(string==(string2)):

            predictions.append(1)
        else:
            predictions.append(0)

        # strin="img"
        # strin+=""+str(i)+""
        # strin+=".jpg"
        strin = str(files[i]).split('/')[2]
        print("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@")
        print(strin)


        synset = strin.split('_')
        actual = ""

        if synset[0] in synset_dict:
            actual = synset_dict[synset[0]]
            print(synset_dict[synset[0]])
        else:
            actual = synset_dict[childsynset_dict[synset[0]]]
            print(synset_dict[childsynset_dict[synset[0]]])



        # for idx in indices[0]:
        #     per.append(percentage[idx].item())
        # totPercent=[]

        for i in range(len(percentage)):
            per.append(percentage[i].item())
        totPercent=[]
        total_per.append(per)


        max_prob = max(per)
        mp = round(max_prob, 2)

        predict = ""
        print(per.index(max(per)))
        print(index_dict[per.index(max(per))+1])
        predict = index_dict[per.index(max(per))+1]


        value = 0

        # if predict is actual: 
        #     value = 10
        # else:
        #     value = 12

        mc = {
            "actual": actual,
            "predicted": predict,
            "image": []
        }

        mc['image'].append(strin)
        misclassified.append(mc)

        key = (actual, predict)

        if key not in misclassify:

            misclassify[key] = {
                "actual": actual,
                "predicted": predict,
                "value": value,
                "max_prob": mp,
                "image": []
            }

        misclassify[key]['image'].append(strin)
        misclassify[key]['value'] = misclassify[key]['value'] + 1

        theClasses.append(actual)
        


        entry = {
            "actual": actual,
            "predicted": predict,
            "name": strin,
            "probabilities": per,
        }

        modified_data.append(entry)

        for l in range(len(per)):
            totPercent.append(per[l])
        values.append(totPercent)

    # json_data = json.dumps(values)
    #
    # with open('mnasnet.json', 'w') as f:
    #     f.write(json_data)

    ans = 0
    for i in range(len(predictions)):
        if(predictions[i]==1):
            ans+=1

    print(ans)
    print(len(predictions))


    out_file = "mnasnet0_5data.json"

    with open(out_file, "w") as of:
        json.dump(misclassified, of, indent=4)

    print(f"The mc data has been written to `{out_file}`.")


    misclass = list(misclassify.values())
    out_file = "misclassify_mnasnet0_5.json"

    with open(out_file, "w") as jf:
        json.dump(misclass, jf, indent=4)

    print(f"The misclassify data has been written to `{out_file}`.")
    print(theClasses)


    output_json_file = "Mnasnet0_5.json"

    with open(output_json_file, "w") as json_file:
        json.dump(modified_data, json_file, indent=4)

    print(f"The modified data has been written to '{output_json_file}'.")


@app.route('/')
def index():
    print(fetch_alex())

    return render_template('index.html')
@app.route('/runAlex')
def run_alex():
    data_folder = request.args.get('data' , type=str)
    truth_file = request.args.get('truth' , type=str)
    # data_folder = './1200_dataset'
    # truth_file = './1200_truth.json'

    generate_alex_net(data_folder, truth_file)

    return jsonify({"message": "AlexNet generation initiated"})

@app.route('/runMobile')
def run_mobile():
    data_folder = request.args.get('data', type=str)
    truth_file = request.args.get('truth', type=str)
    # data_folder = './dataset'
    # truth_file = './truth.json'

    generate_mobile_net(data_folder, truth_file)

    return jsonify({"message": "MobileNet generation initiated"})

@app.route('/runShuffle')
def run_shuffle():
    data_folder = request.args.get('data', type=str)
    truth_file = request.args.get('truth', type=str)
    # data_folder = './dataset'
    # truth_file = './truth.json'

    generate_shuffle_net(data_folder, truth_file)

    return jsonify({"message": "ShuffleNet generation initiated"})

@app.route('/runSqueezenet1_0')
def run_squeezenet1_0():
    data_folder = request.args.get('data', type=str)
    truth_file = request.args.get('truth', type=str)
    # data_folder = './dataset'
    # truth_file = './truth.json'

    generate_squeeze1_0_net(data_folder, truth_file)

    return jsonify({"message": "Squeezenet1_0 generation initiated"})


@app.route('/runSqueezenet1_1')
def run_squeezenet1_1():
    data_folder = request.args.get('data', type=str)
    truth_file = request.args.get('truth', type=str)
    # data_folder = './dataset'
    # truth_file = './truth.json'

    generate_squeeze1_1_net(data_folder, truth_file)

    return jsonify({"message": "Squeezenet1_1 generation initiated"})


@app.route('/runMnasnet0_5')
def run_Mnasnet0_5():
    data_folder = request.args.get('data', type=str)
    truth_file = request.args.get('truth', type=str)
    # data_folder = './dataset'
    # truth_file = './truth.json'

    generate_mnasnet0_5_net(data_folder, truth_file)

    return jsonify({"message": "Mnasnet0_5 generation initiated"})


@app.route('/fetchAlex')
def fetch_alex():
    model = request.args.get('model', default='alexnet', type=str)
    # filename = "Alex_Net_values.json"
    # filename = './image_json_files_alex/img7.json'
    filename = "Alexnet.json"
    # filename = "truth.json"

    try:
        with open(filename, 'r') as json_file:
            data = json.load(json_file)
        return jsonify(data)
    except FileNotFoundError:

        return jsonify({"error": "File not found"}), 404

@app.route('/fetchMobile')
def fetch_mobile():
    model = request.args.get('model', default='mobilenet', type=str)
    # filename = "Mobile_Net_values.json"
    #filename = './image_json_files_mobile/img7.json'
    filename = "Mobilenet.json"

    try:
        with open(filename, 'r') as json_file:
            data = json.load(json_file)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

@app.route('/fetchShuffle')
def fetch_shuffle():
    model = request.args.get('model', default='shufflenet', type=str)
    # filename = "Mobile_Net_values.json"
    #filename = './image_json_files_mobile/img7.json'
    filename = "Shufflenet.json"

    try:
        with open(filename, 'r') as json_file:
            data = json.load(json_file)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404

@app.route('/fetchSqueezenet1_0')
def fetch_squeezenet1_0():
    model = request.args.get('model', default='squeezenet1_0', type=str)
    # filename = "Mobile_Net_values.json"
    #filename = './image_json_files_mobile/img7.json'
    filename = "Squeezenet1_0.json"

    try:
        with open(filename, 'r') as json_file:
            data = json.load(json_file)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404


@app.route('/fetchSqueezenet1_1')
def fetch_squeezenet1_1():
    model = request.args.get('model', default='squeezenet1_1', type=str)
    # filename = "Mobile_Net_values.json"
    #filename = './image_json_files_mobile/img7.json'
    filename = "Squeezenet1_1.json"

    try:
        with open(filename, 'r') as json_file:
            data = json.load(json_file)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404


@app.route('/fetchMnasnet0_5')
def fetch_mnasnet0_5():
    model = request.args.get('model', default='mnasnet0_5', type=str)
    # filename = "Mobile_Net_values.json"
    #filename = './image_json_files_mobile/img7.json'
    filename = "Mnasnet0_5.json"

    try:
        with open(filename, 'r') as json_file:
            data = json.load(json_file)
        return jsonify(data)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404


@app.route('/api/classes')
def get_classes():
    try:
        with open('classes.json', 'r') as f:
            class_data = json.load(f)
        return jsonify(class_data)
    except FileNotFoundError:
        return jsonify({"error": "Class data not found"}), 404


@app.route('/synset_truthlabel')
def get_truthlabel():
    try:
        with open('synset_list_2012_details.json', 'r') as f:
            truthlabel_data = json.load(f)
        return jsonify(truthlabel_data)
    except FileNotFoundError:
        return jsonify({"error": "Class data not found"}), 404



@app.route('/uploads_images', methods=['POST'])
def upload_images():
    # if 'images' not in request.files:
    #     return 'No images part'
    folder_path = './uploads_images'

    for filename in os.listdir(folder_path):
        file_path = os.path.join(folder_path, filename)
        if os.path.isfile(file_path):
            os.remove(file_path)


    images = request.files.getlist('images')
    for image in images:
        image.save(os.path.join(app.config['UPLOAD_FOLDER'], image.filename))

    return 'Images uploaded successfully'


@app.route('/uploads_images_two', methods=['POST'])
def upload_images_two():
    # if 'images' not in request.files:
    #     return 'No images part'
    # folder_path = './uploads_images'

    # for filename in os.listdir(folder_path):
    #     file_path = os.path.join(folder_path, filename)
    #     if os.path.isfile(file_path):
    #         os.remove(file_path)


    images = request.files.getlist('images')
    for image in images:
        image.save(os.path.join(app.config['UPLOAD_FOLDER'], image.filename))

    return 'Images uploaded successfully'



@app.route('/uploads_truth', methods=['GET', 'POST'])
def upload_file():
    if request.method == 'GET':
        UPLOAD_TRUTH_FOLDER = 'uploads_truth'
        app.config['UPLOAD_TRUTH_FOLDER'] = UPLOAD_TRUTH_FOLDER
        files = os.listdir(app.config['UPLOAD_TRUTH_FOLDER'])
        if files:
            for f in files:
                print(f)
                os.remove(UPLOAD_TRUTH_FOLDER + '/' +f)
            return jsonify({"message": "Folder is empty", "files": []}), 200
        return jsonify({"message": "Folder contains files", "files": files}), 200


    if request.method == 'POST':
        UPLOAD_TRUTH_FOLDER = 'uploads_truth'
        app.config['UPLOAD_TRUTH_FOLDER'] = UPLOAD_TRUTH_FOLDER

        # if 'file' not in request.files:
        #     return 'No file part'

        # file = request.files['file']
        # if file.filename == '':
        #     return 'No selected file'

        folder_path = './uploads_truth'

        for filename in os.listdir(folder_path):
            file_path = os.path.join(folder_path, filename)
            if os.path.isfile(file_path):
                os.remove(file_path)

        files = request.files.getlist('file')
        for file in files:
            file.save(os.path.join(app.config['UPLOAD_TRUTH_FOLDER'], file.filename))
        
        return 'File uploaded successfully'


@app.route('/upload_model', methods=['POST'])
def upload_model():
    UPLOAD_MODEL_FOLDER = 'uploads_model'
    app.config['UPLOAD_MODEL_FOLDER'] = UPLOAD_MODEL_FOLDER

    if 'file' not in request.files:
        return 'No file part'

    file = request.files['file']
    if file.filename == '':
        return 'No selected file'

    if file:
        file.save(os.path.join(app.config['UPLOAD_MODEL_FOLDER'], file.filename))
        return 'Model uploaded successfully'

@app.route('/images')
def get_images():
    image_files = os.listdir(app.config['UPLOAD_FOLDER'])
    image_urls = [f'/uploads/{filename}' for filename in image_files]
    return image_urls

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/api/save-file', methods=['POST'])
def save_file():
   
    filenames = ["alexnetdata.json", "mobilenetdata.json", "shufflenetdata.json", "squeeze1_0data.json", "squeeze1_1data.json", "mnasnet0_5data.json"]
    fnames = ["misclassify_alexnet.json", "misclassify_mobilenet.json", "misclassify_shufflenet.json", "misclassify_squeeze1_0.json", "misclassify_squeeze1_1.json", "misclassify_mnasnet0_5.json"]
    
    try:
        #remove all the files
        for filename in os.listdir(os.path.join(FRONTEND_FOLDER)):
            file_path = os.path.join(FRONTEND_FOLDER, filename)
            if os.path.isfile(file_path):
                os.remove(file_path)

        # Loop over each file, read content, and save it to the frontend folder
        for filename in filenames:
            # Load data from the original file
            with open(filename, 'r') as json_file:
                data = json.load(json_file)

            # Define the file path in the frontend folder
            file_path = os.path.join(FRONTEND_FOLDER, filename)
            
            # Save the file data to the frontend folder
            with open(file_path, 'w') as json_file:
                json.dump(data, json_file, indent=4)

        #remove all the files
        for filename in os.listdir(os.path.join(FRONTEND_FOLDER_MC)):
            file_path = os.path.join(FRONTEND_FOLDER_MC, filename)
            if os.path.isfile(file_path):
                os.remove(file_path)

        for f in fnames:
            with open(f, 'r') as jf:
                data = json.load(jf)

            file_path_mc = os.path.join(FRONTEND_FOLDER_MC, f)

            with open(file_path_mc, 'w') as json_f:
                json.dump(data, json_f, indent=4)

        return jsonify({"message": "Files saved successfully!"})

    except Exception as e:
        return jsonify({"message": "Error saving files", "error": str(e)}), 500


    # filename2 = "mobilenetdata.json"
    # with open(filename2, 'r') as json_file:
    #         data2 = json.load(json_file)

    # file_path2 = os.path.join(FRONTEND_FOLDER, filename2)

    # try:
    #     with open(file_path2, 'w') as json_file:
    #         json.dump(data2, json_file, indent=4)
    #     return jsonify({"message": "File saved successfully! 2"})
    # except Exception as e:
    #     return jsonify({"message": "Error saving file", "error": str(e)}), 500




if __name__ == '__main__':
    app.run(debug=True)
